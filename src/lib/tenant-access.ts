import { supabaseAdmin } from './supabase-admin';

interface CachedTenantAccess {
    is_suspended?: boolean;
    suspension_reason?: string | null;
    force_logout_after?: string | null;
}

interface CachedTenantBilling {
    plan_id?: string | null;
    plan_name?: string | null;
    payment_status?: string | null;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
}

const accessCache = new Map<string, { data: CachedTenantAccess | null; expiresAt: number }>();
const billingCache = new Map<string, { data: CachedTenantBilling | null; expiresAt: number }>();
const userSessionCache = new Map<string, { revoked: boolean; expiresAt: number }>();

const CACHE_TTL_MS = 30_000; // 30 seconds in-memory cache

export function clearTenantAccessCache(companyOwnerId?: string) {
    if (companyOwnerId) {
        accessCache.delete(companyOwnerId);
        billingCache.delete(companyOwnerId);
    } else {
        accessCache.clear();
        billingCache.clear();
        userSessionCache.clear();
    }
}

async function getTenantAccessData(companyOwnerId: string): Promise<CachedTenantAccess | null> {
    if (!supabaseAdmin || !companyOwnerId) return null;

    const cached = accessCache.get(companyOwnerId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('admin_tenant_access')
            .select('is_suspended, suspension_reason, force_logout_after')
            .eq('company_owner_id', companyOwnerId)
            .maybeSingle();

        if (error) {
            if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message)) {
                accessCache.set(companyOwnerId, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
                return null;
            }
            throw error;
        }

        const record = data || null;
        accessCache.set(companyOwnerId, { data: record, expiresAt: Date.now() + CACHE_TTL_MS });
        return record;
    } catch {
        return null;
    }
}

export async function getTenantBillingRecord(companyOwnerId: string): Promise<CachedTenantBilling | null> {
    if (!supabaseAdmin || !companyOwnerId) return null;

    const cached = billingCache.get(companyOwnerId);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('admin_tenant_billing')
            .select('plan_id, plan_name, payment_status, trial_started_at, trial_ends_at')
            .eq('company_owner_id', companyOwnerId)
            .maybeSingle();

        if (error) {
            if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message)) {
                billingCache.set(companyOwnerId, { data: null, expiresAt: Date.now() + CACHE_TTL_MS });
                return null;
            }
            throw error;
        }

        const record = data || null;
        billingCache.set(companyOwnerId, { data: record, expiresAt: Date.now() + CACHE_TTL_MS });
        return record;
    } catch {
        return null;
    }
}

export async function isTenantSuspended(companyOwnerId: string): Promise<boolean> {
    const data = await getTenantAccessData(companyOwnerId);
    return data?.is_suspended === true;
}

export async function getTenantSuspensionReason(companyOwnerId: string): Promise<string | null> {
    const data = await getTenantAccessData(companyOwnerId);
    return data?.is_suspended ? data.suspension_reason || null : null;
}

export async function isTrialAccessBlocked(companyOwnerId: string): Promise<boolean> {
    const data = await getTenantBillingRecord(companyOwnerId);
    if (!data || data.payment_status !== 'trial' || !data.trial_started_at || !data.trial_ends_at) {
        return false;
    }
    return new Date(data.trial_ends_at).getTime() <= Date.now();
}

export async function isWebSessionAllowed(companyOwnerId: string, sessionId?: string, issuedAtSeconds?: number): Promise<boolean> {
    if (!supabaseAdmin || !companyOwnerId) return true;

    const access = await getTenantAccessData(companyOwnerId);
    if (access?.force_logout_after && issuedAtSeconds && issuedAtSeconds * 1000 <= new Date(access.force_logout_after).getTime()) {
        return false;
    }

    if (!sessionId) return true;

    const cachedSession = userSessionCache.get(sessionId);
    if (cachedSession && cachedSession.expiresAt > Date.now()) {
        return !cachedSession.revoked;
    }

    try {
        const { data: session, error } = await supabaseAdmin
            .from('admin_user_sessions')
            .select('revoked_at')
            .eq('id', sessionId)
            .eq('company_owner_id', companyOwnerId)
            .maybeSingle();

        if (error && !(error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message))) {
            throw error;
        }

        const isRevoked = !!session?.revoked_at;
        userSessionCache.set(sessionId, { revoked: isRevoked, expiresAt: Date.now() + CACHE_TTL_MS });
        return !isRevoked;
    } catch {
        return true;
    }
}
