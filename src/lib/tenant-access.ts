import { supabaseAdmin } from './supabase-admin';

export async function isTenantSuspended(companyOwnerId: string): Promise<boolean> {
    if (!supabaseAdmin || !companyOwnerId) return false;
    const { data, error } = await supabaseAdmin
        .from('admin_tenant_access')
        .select('is_suspended')
        .eq('company_owner_id', companyOwnerId)
        .maybeSingle();
    if (error) {
        // Backward-compatible until the additive admin migration is deployed.
        if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message)) return false;
        throw new Error(`Mandantensperre konnte nicht geprüft werden: ${error.message}`);
    }
    return data?.is_suspended === true;
}

export async function isWebSessionAllowed(companyOwnerId: string, sessionId?: string, issuedAtSeconds?: number): Promise<boolean> {
    if (!supabaseAdmin || !companyOwnerId) return true;
    const { data: access, error: accessError } = await supabaseAdmin
        .from('admin_tenant_access').select('force_logout_after').eq('company_owner_id', companyOwnerId).maybeSingle();
    if (accessError && !(accessError.code === '42P01' || accessError.code === 'PGRST205' || /does not exist/i.test(accessError.message))) throw accessError;
    if (access?.force_logout_after && issuedAtSeconds && issuedAtSeconds * 1000 <= new Date(access.force_logout_after).getTime()) return false;
    if (!sessionId) return true;
    const { data: session, error } = await supabaseAdmin.from('admin_user_sessions').select('revoked_at').eq('id', sessionId).eq('company_owner_id', companyOwnerId).maybeSingle();
    if (error && !(error.code === '42P01' || error.code === 'PGRST205' || /does not exist/i.test(error.message))) throw error;
    return !session?.revoked_at;
}
