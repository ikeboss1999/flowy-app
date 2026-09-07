import { NextResponse } from 'next/server';
import { getUserSession } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getUserSession({ allowExpiredTrial: true });
    if (!session) return NextResponse.json({ message: 'Nicht autorisiert' }, { status: 401 });
    if (!supabaseAdmin) return NextResponse.json({ message: 'Server nicht konfiguriert' }, { status: 503 });
    const { data: billing, error } = await supabaseAdmin.from('admin_tenant_billing').select('plan_id,plan_name,billing_cycle,price_amount,currency,payment_status,trial_started_at,trial_ends_at,next_payment_at').eq('company_owner_id', session.companyOwnerId).maybeSingle();
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    if (!billing) return NextResponse.json({ assigned: false });
    let plan = null;
    if (billing.plan_id || billing.plan_name) {
        const planQuery = supabaseAdmin.from('admin_subscription_plans').select('id,slug,name,description,features,limits');
        const result = billing.plan_id
            ? await planQuery.eq('id', billing.plan_id).maybeSingle()
            : await planQuery.ilike('name', String(billing.plan_name)).maybeSingle();
        if (result.error) return NextResponse.json({ message: result.error.message }, { status: 500 });
        plan = result.data;
    }
    return NextResponse.json({ assigned: true, billing, plan });
}
