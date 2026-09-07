import { supabaseAdmin } from '@/lib/supabase-admin';

interface ProvisioningUser {
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
}

export async function provisionRequestedTrial(user: ProvisioningUser, companyOwnerId: string, role?: string) {
    if (!supabaseAdmin || user.id !== companyOwnerId || role === 'developer' || role === 'employee') return { provisioned: false, reason: 'not_owner' };
    const requestedSlug = typeof user.user_metadata?.requested_plan === 'string' ? user.user_metadata.requested_plan : '';
    const normalizedEmail = user.email?.trim().toLowerCase() || '';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizedEmail));
    const emailHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const requestedAt = typeof user.user_metadata?.trial_requested_at === 'string' ? Date.parse(user.user_metadata.trial_requested_at) : NaN;
    if (!normalizedEmail || !/^[a-z0-9-]{1,80}$/.test(requestedSlug) || !Number.isFinite(requestedAt)) return { provisioned: false, reason: 'not_requested' };

    const [{ data: existingBilling, error: billingReadError }, { data: existingClaim, error: claimReadError }] = await Promise.all([
        supabaseAdmin.from('admin_tenant_billing').select('company_owner_id').eq('company_owner_id', companyOwnerId).maybeSingle(),
        supabaseAdmin.from('admin_trial_claims').select('company_owner_id').or(`company_owner_id.eq.${companyOwnerId},email_hash.eq.${emailHash}`).limit(1).maybeSingle(),
    ]);
    if (billingReadError || claimReadError) throw billingReadError || claimReadError;
    if (existingBilling || existingClaim) return { provisioned: false, reason: 'already_configured' };

    const { data: plan, error: planError } = await supabaseAdmin.from('admin_subscription_plans').select('id,slug,name,monthly_price,currency,trial_days').eq('slug', requestedSlug).eq('is_active', true).eq('is_public', true).maybeSingle();
    if (planError) throw planError;
    if (!plan) return { provisioned: false, reason: 'plan_unavailable' };

    const startedAt = new Date();
    const endsAt = new Date(startedAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + Number(plan.trial_days));
    const claim = { company_owner_id: companyOwnerId, email_hash: emailHash, plan_id: plan.id, requested_slug: requestedSlug, started_at: startedAt.toISOString(), ends_at: endsAt.toISOString() };
    const { error: claimError } = await supabaseAdmin.from('admin_trial_claims').insert(claim);
    if (claimError) {
        if (claimError.code === '23505') return { provisioned: false, reason: 'already_claimed' };
        throw claimError;
    }

    const { error: billingError } = await supabaseAdmin.from('admin_tenant_billing').insert({ company_owner_id: companyOwnerId, plan_id: plan.id, plan_name: plan.name, billing_cycle: 'monthly', price_amount: Number(plan.monthly_price), currency: plan.currency, payment_status: 'trial', trial_started_at: startedAt.toISOString(), trial_ends_at: endsAt.toISOString(), updated_at: startedAt.toISOString() });
    if (billingError) {
        await supabaseAdmin.from('admin_trial_claims').delete().eq('company_owner_id', companyOwnerId);
        if (billingError.code === '23505') return { provisioned: false, reason: 'already_configured' };
        throw billingError;
    }
    return { provisioned: true, plan: plan.name, endsAt: endsAt.toISOString() };
}
