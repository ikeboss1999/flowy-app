import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLAN_FEATURES } from '@/lib/subscription-plans';
import content from '../../../../../content/public-site.json';

export const dynamic = 'force-dynamic';

const featureLabels = new Map<string, string>(PLAN_FEATURES.map(feature => [feature.id, feature.label]));
const fallback = content.packages.map(plan => ({ ...plan, trialDays: content.trial.days, currency: 'EUR' }));

export async function GET() {
    if (!supabaseAdmin) return NextResponse.json({ plans: fallback, source: 'fallback' });
    const { data, error } = await supabaseAdmin
        .from('admin_subscription_plans')
        .select('slug,name,description,monthly_price,yearly_price,currency,trial_days,features,is_featured,sort_order')
        .eq('is_active', true)
        .eq('is_public', true)
        .order('sort_order')
        .order('name');
    if (error) {
        console.warn('[PublicPlans] Database unavailable, using fallback:', error.message);
        return NextResponse.json({ plans: fallback, source: 'fallback' });
    }
    const plans = (data || []).map(plan => ({
        id: plan.slug,
        name: plan.name,
        description: plan.description,
        monthlyPrice: Number(plan.monthly_price),
        yearlyPrice: Number(plan.yearly_price),
        currency: plan.currency,
        trialDays: plan.trial_days,
        featured: plan.is_featured,
        features: Array.isArray(plan.features) ? plan.features.map(feature => featureLabels.get(String(feature))).filter((label): label is string => Boolean(label)) : [],
    }));
    return NextResponse.json({ plans, source: 'database' });
}
