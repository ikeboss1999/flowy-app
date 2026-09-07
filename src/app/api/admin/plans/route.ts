import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkAdmin } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { PLAN_FEATURES } from '@/lib/subscription-plans';

export const dynamic = 'force-dynamic';

const featureIds = new Set<string>(PLAN_FEATURES.map(feature => feature.id));
const planSchema = z.object({
    id: z.string().uuid().optional(),
    slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
    name: z.string().trim().min(1).max(80),
    description: z.string().trim().max(500),
    monthlyPrice: z.number().min(0).max(1_000_000),
    yearlyPrice: z.number().min(0).max(10_000_000),
    currency: z.string().trim().length(3).transform(value => value.toUpperCase()),
    trialDays: z.number().int().min(0).max(365),
    features: z.array(z.string()).refine(values => values.every(value => featureIds.has(value))),
    limits: z.record(z.string(), z.number().int().min(0).nullable()).default({}),
    isActive: z.boolean(),
    isPublic: z.boolean(),
    isFeatured: z.boolean(),
    sortOrder: z.number().int().min(0).max(10_000),
});

async function authorize() {
    const admin = await checkAdmin();
    if (!admin) return { error: NextResponse.json({ message: 'Nicht autorisiert' }, { status: 403 }) };
    if (!supabaseAdmin) return { error: NextResponse.json({ message: 'Admin-Client nicht konfiguriert' }, { status: 503 }) };
    return { admin };
}

export async function GET() {
    const auth = await authorize();
    if ('error' in auth) return auth.error;
    const { data, error } = await supabaseAdmin!.from('admin_subscription_plans').select('*').order('sort_order').order('name');
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json(data || []);
}

async function save(request: Request, requireId: boolean) {
    const auth = await authorize();
    if ('error' in auth) return auth.error;
    const parsed = planSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || (requireId && !parsed.data?.id)) return NextResponse.json({ message: 'Ungültige Paketdaten', details: parsed.error?.flatten() }, { status: 400 });
    const value = parsed.data;
    const record = {
        slug: value.slug, name: value.name, description: value.description,
        monthly_price: value.monthlyPrice, yearly_price: value.yearlyPrice, currency: value.currency,
        trial_days: value.trialDays, features: value.features, limits: value.limits,
        is_active: value.isActive, is_public: value.isPublic, is_featured: value.isFeatured,
        sort_order: value.sortOrder, updated_at: new Date().toISOString(),
    };
    const query = requireId
        ? supabaseAdmin!.from('admin_subscription_plans').update(record).eq('id', value.id!).select().single()
        : supabaseAdmin!.from('admin_subscription_plans').insert(record).select().single();
    const { data, error } = await query;
    if (error) return NextResponse.json({ message: error.code === '23505' ? 'Diese interne Paket-ID ist bereits vergeben.' : error.message }, { status: 500 });
    await supabaseAdmin!.from('admin_audit_logs').insert({ developer_user_id: auth.admin.userId, action: requireId ? 'plan.updated' : 'plan.created', target_type: 'subscription_plan', target_id: data.id, details: { slug: data.slug, name: data.name } });
    return NextResponse.json(data, { status: requireId ? 200 : 201 });
}

export async function POST(request: Request) { return save(request, false); }
export async function PATCH(request: Request) { return save(request, true); }
