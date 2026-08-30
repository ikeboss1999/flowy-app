import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserSession } from '@/lib/auth-server';
import { supabaseAdmin } from '@/lib/supabase-admin';

const activitySchema = z.object({
    sessionId: z.string().uuid(),
    appSource: z.enum(['web', 'employee']).default('web'),
});

export async function POST(request: Request) {
    const session = await getUserSession();
    if (!session || !supabaseAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = activitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
    const ipHash = forwarded
        ? createHash('sha256').update(`${process.env.SESSION_HASH_SECRET || process.env.CRON_SECRET || ''}:${forwarded}`).digest('hex')
        : null;
    const now = new Date().toISOString();
    const { data: existing } = await supabaseAdmin.from('admin_user_sessions').select('revoked_at').eq('id', parsed.data.sessionId).maybeSingle();
    if (existing?.revoked_at) return NextResponse.json({ tracked: false, revoked: true }, { status: 403 });
    const payload = { user_id: session.userId, company_owner_id: session.companyOwnerId, app_source: parsed.data.appSource, user_agent: request.headers.get('user-agent')?.slice(0, 500) || null, ip_hash: ipHash, last_seen_at: now };
    const result = existing
        ? await supabaseAdmin.from('admin_user_sessions').update(payload).eq('id', parsed.data.sessionId).is('revoked_at', null)
        : await supabaseAdmin.from('admin_user_sessions').insert({ id: parsed.data.sessionId, ...payload });
    const { error } = result;
    if (error) {
        // The application remains usable before the additive admin migration is deployed.
        console.warn('[Activity] heartbeat unavailable:', error.message);
        return NextResponse.json({ tracked: false });
    }
    return NextResponse.json({ tracked: true });
}
