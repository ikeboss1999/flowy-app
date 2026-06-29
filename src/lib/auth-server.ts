import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { supabaseAdmin } from './supabase-admin';
import { verifySessionToken } from './auth';

export async function getUserSession() {
    let cookieStore;
    try {
        cookieStore = cookies();
    } catch (e) {
        return null;
    }

    const client = supabaseAdmin || supabase;

    // 1. Try Supabase Session (Manual cookie check for reliability)
    const sbAccessToken = (await cookieStore).get('sb-access-token')?.value;
    if (sbAccessToken) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(sbAccessToken);
            if (user) {
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

                return {
                    userId: user.id,
                    companyOwnerId: roleData?.company_owner_id || user.id,
                    role: roleData?.role || defaultRole,
                    permissions: roleData?.permissions || { "*": true },
                    email: user.email,
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    accessToken: sbAccessToken
                };
            }
        } catch (e) {
            console.error('[AuthServer] Supabase session check failed:', e);
        }
    }

    // 2. Try Legacy session_token
    const token = (await cookieStore).get('session_token')?.value;
    if (token) {
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

            return {
                userId: userId,
                companyOwnerId: roleData?.company_owner_id || userId,
                role: roleData?.role || defaultRole,
                permissions: roleData?.permissions || defaultPerms,
                email: email,
                name: (payload as any).name || email.split('@')[0]
            };
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
    // Developer und Admin haben immer Zugriff auf alles im eigenen Mandanten
    if (session.role === 'developer' || session.role === 'admin') return true;
    if (session.permissions?.['*'] === true) return true;

    // Spezifisches Recht prüfen
    return !!session.permissions?.[permissionKey];
}


