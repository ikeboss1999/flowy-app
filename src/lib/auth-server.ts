import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { verifySessionToken } from './auth';
import { isTenantSuspended, isTrialAccessBlocked, isWebSessionAllowed, getTenantBillingRecord } from './tenant-access';

const sessionCache = new Map<string, { session: any; expiresAt: number }>();
const planFeaturesCache = new Map<string, { features: string[]; expiresAt: number }>();

async function attachPlanFeatures(session: any) {
    if (!supabaseAdmin || !session?.companyOwnerId || session.role === 'developer') return session;
    try {
        const billing = await getTenantBillingRecord(session.companyOwnerId);
        if (!billing) return session;

        const cacheKey = String(billing.plan_id || billing.plan_name || 'default');
        const cachedPlan = planFeaturesCache.get(cacheKey);
        if (cachedPlan && cachedPlan.expiresAt > Date.now()) {
            return { ...session, planFeatures: cachedPlan.features };
        }

        let planQuery = supabaseAdmin.from('admin_subscription_plans').select('features');
        const { data: plan } = billing.plan_id
            ? await planQuery.eq('id', billing.plan_id).maybeSingle()
            : await planQuery.ilike('name', String(billing.plan_name || '')).maybeSingle();

        const features = Array.isArray(plan?.features) ? plan.features : [];
        planFeaturesCache.set(cacheKey, { features, expiresAt: Date.now() + 300_000 });
        return { ...session, planFeatures: features };
    } catch { return session; }
}

export async function getUserSession(options: { allowExpiredTrial?: boolean } = {}) {
    let cookieStore;
    try {
        cookieStore = await cookies();
    } catch (e) {
        return null;
    }

    const client = supabaseAdmin || supabase;

    // 1. Try Supabase Session (Manual cookie check for reliability)
    const sbAccessToken = (await cookieStore).get('sb-access-token')?.value;
    if (sbAccessToken) {
        const cached = sessionCache.get(sbAccessToken);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.session;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser(sbAccessToken);
            if (user) {
                let supabaseIssuedAt: number | undefined;
                try { supabaseIssuedAt = Number(JSON.parse(Buffer.from(sbAccessToken.split('.')[1], 'base64url').toString('utf8')).iat) || undefined; } catch { }
                // Fetch role and permissions mapping from database
                let roleData: any = null;
                const { data, error: fetchError } = await client
                    .from('user_roles')
                    .select('company_owner_id, role, permissions, status')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (!fetchError && data) {
                    roleData = data;
                    if (data.status === 'pending') {
                        await client
                            .from('user_roles')
                            .update({ status: 'active' })
                            .eq('user_id', user.id);
                        roleData.status = 'active';
                    }
                } else if (!data) {
                    // Backward-compatibility: auto-create user_roles entry for existing users
                    const defaultRole = user.email === 'elsword.ie@gmail.com' ? 'developer' : 'admin';
                    const { data: inserted, error: insertError } = await client
                        .from('user_roles')
                        .insert({
                            user_id: user.id,
                            company_owner_id: user.id,
                            role: defaultRole,
                            permissions: { "*": true },
                            status: 'active'
                        })
                        .select('company_owner_id, role, permissions')
                        .maybeSingle();

                    if (!insertError && inserted) {
                        roleData = inserted;
                    }
                }

                const defaultRole = user.email === 'elsword.ie@gmail.com' ? 'developer' : 'admin';

                const resolvedSession = {
                    userId: user.id,
                    companyOwnerId: roleData?.company_owner_id || user.id,
                    role: roleData?.role || defaultRole,
                    permissions: roleData?.permissions || { "*": true },
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    accessToken: sbAccessToken
                };
                const enrichedSession = await attachPlanFeatures(resolvedSession);
                if (enrichedSession.role !== 'developer') {
                    const [suspended, trialBlocked, webAllowed] = await Promise.all([
                        isTenantSuspended(enrichedSession.companyOwnerId),
                        !options.allowExpiredTrial ? isTrialAccessBlocked(enrichedSession.companyOwnerId) : Promise.resolve(false),
                        isWebSessionAllowed(enrichedSession.companyOwnerId, undefined, supabaseIssuedAt)
                    ]);
                    if (suspended || trialBlocked || !webAllowed) return null;
                }
                sessionCache.set(sbAccessToken, { session: enrichedSession, expiresAt: Date.now() + 30_000 });
                return enrichedSession;
            }
        } catch (e) {
            console.error('[AuthServer] Supabase session check failed:', e);
        }
    }

    // 2. Try Legacy session_token
    const token = (await cookieStore).get('session_token')?.value;
    if (token) {
        const cached = sessionCache.get(token);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.session;
        }

        const payload = await verifySessionToken(token);
        if (payload) {
            const userId = payload.userId;
            const email = payload.email || '';

            // Fetch role and permissions mapping from database
            let roleData: any = null;
            try {
                const { data, error: fetchError } = await client
                    .from('user_roles')
                    .select('company_owner_id, role, permissions, status')
                    .eq('user_id', userId)
                    .maybeSingle();

                if (!fetchError && data) {
                    roleData = data;
                    if (data.status === 'pending') {
                        await client
                            .from('user_roles')
                            .update({ status: 'active' })
                            .eq('user_id', userId);
                        roleData.status = 'active';
                    }
                } else if (!data) {
                    // Backward-compatibility: auto-create user_roles entry for existing legacy users
                    const defaultRole = email === 'elsword.ie@gmail.com' ? 'developer' : (payload.role === 'employee' ? 'employee' : 'admin');
                    const defaultPerms = payload.role === 'employee' ? { timeTracking: true } : { "*": true };
                    const { data: inserted, error: insertError } = await client
                        .from('user_roles')
                        .insert({
                            user_id: userId,
                            company_owner_id: userId,
                            role: defaultRole,
                            permissions: defaultPerms,
                            status: 'active'
                        })
                        .select('company_owner_id, role, permissions')
                        .maybeSingle();

                    if (!insertError && inserted) {
                        roleData = inserted;
                    }
                }
            } catch (err) {
                console.error('[AuthServer] Legacy database lookup failed:', err);
            }

            const defaultRole = email === 'elsword.ie@gmail.com' ? 'developer' : (payload.role === 'employee' ? 'employee' : 'admin');
            const defaultPerms = payload.role === 'employee' ? { timeTracking: true } : { "*": true };

            const resolvedSession = {
                userId: userId,
                companyOwnerId: roleData?.company_owner_id || userId,
                role: roleData?.role || defaultRole,
                permissions: roleData?.permissions || defaultPerms,
                email: email,
                name: (payload as any).name || email.split('@')[0],
                employeeId: payload.employeeId
            };
            const enrichedSession = await attachPlanFeatures(resolvedSession);
            if (enrichedSession.role !== 'developer') {
                const [suspended, trialBlocked, webAllowed] = await Promise.all([
                    isTenantSuspended(enrichedSession.companyOwnerId),
                    !options.allowExpiredTrial ? isTrialAccessBlocked(enrichedSession.companyOwnerId) : Promise.resolve(false),
                    isWebSessionAllowed(enrichedSession.companyOwnerId, typeof payload.sid === 'string' ? payload.sid : undefined, typeof payload.iat === 'number' ? payload.iat : undefined)
                ]);
                if (suspended || trialBlocked || !webAllowed) return null;
            }

            sessionCache.set(token, {
                session: enrichedSession,
                expiresAt: Date.now() + 30_000
            });

            return enrichedSession;
        }
    }

    return null;
}

export async function checkAdmin() {
    const session = await getUserSession();
    // Only 'developer' can access the global system admin features!
    if (session && session.role === 'developer') {
        return session;
    }
    return null;
}

export function hasPermission(session: any, permissionKey: string): boolean {
    if (!session) return false;
    // Entwickler haben immer Vollzugriff. Firmen-Admins unterliegen dem Paket.
    if (session.role === 'developer') return true;
    if (Array.isArray(session.planFeatures)) {
        const feature = permissionKey.split('_')[0];
        const featureMap: Record<string, string> = { dashboard: 'dashboard', crm: 'crm', customers: 'customers', projects: 'projects', vehicles: 'vehicles', catalog: 'catalog', archive: 'archive', credentials: 'credentials', offers: 'offers', orders: 'orders', invoices: 'invoices', dunning: 'dunning', reports: 'reports', employees: 'employees', time: 'time_tracking', calendar: 'calendar' };
        const requiredFeature = featureMap[feature];
        if (requiredFeature && !session.planFeatures.includes(requiredFeature)) return false;
    }
    if (session.role === 'admin') return true;
    if (session.permissions?.['*'] === true) return true;

    // Spezifisches Recht prüfen
    return !!session.permissions?.[permissionKey];
}


