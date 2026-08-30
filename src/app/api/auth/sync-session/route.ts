import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isTenantSuspended } from '@/lib/tenant-access';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const accessToken = body.access_token;
        const requestedSessionId = typeof body.session_id === 'string' && /^[0-9a-f-]{36}$/i.test(body.session_id) ? body.session_id : crypto.randomUUID();

        if (!accessToken) {
            return NextResponse.json({ error: 'No token provided' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            return NextResponse.json({
                error: 'Server config error',
                detail: `Missing: ${!supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : ''}`
            }, { status: 500 });
        }

        // Verify token via Supabase REST API — no SDK import needed
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'apikey': supabaseAnonKey,
            }
        });

        if (!userRes.ok) {
            return NextResponse.json({ error: 'Invalid token', detail: `Supabase returned ${userRes.status}` }, { status: 401 });
        }

        const user = await userRes.json();
        if (!user?.id) {
            return NextResponse.json({ error: 'Invalid user data' }, { status: 401 });
        }

        if (supabaseAdmin) {
            const { data: role } = await supabaseAdmin.from('user_roles').select('company_owner_id, role').eq('user_id', user.id).maybeSingle();
            const companyOwnerId = role?.company_owner_id || user.id;
            if (role?.role !== 'developer' && await isTenantSuspended(companyOwnerId)) {
                return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
            }
        }

        const rawSecret = process.env.JWT_SECRET;
        if (!rawSecret) {
            return NextResponse.json({ error: 'Server config error', detail: 'Missing JWT_SECRET' }, { status: 500 });
        }

        const secret = new TextEncoder().encode(rawSecret);
        const companyOwnerId = supabaseAdmin
            ? ((await supabaseAdmin.from('user_roles').select('company_owner_id').eq('user_id', user.id).maybeSingle()).data?.company_owner_id || user.id)
            : user.id;
        if (supabaseAdmin) {
            const now = new Date().toISOString();
            const { data: existingSession } = await supabaseAdmin.from('admin_user_sessions').select('revoked_at').eq('id', requestedSessionId).maybeSingle();
            if (existingSession?.revoked_at) return NextResponse.json({ error: 'Session revoked' }, { status: 401 });
            if (existingSession) await supabaseAdmin.from('admin_user_sessions').update({ user_id: user.id, company_owner_id: companyOwnerId, app_source: 'web', user_agent: request.headers.get('user-agent')?.slice(0, 500) || null, last_seen_at: now }).eq('id', requestedSessionId).is('revoked_at', null);
            else await supabaseAdmin.from('admin_user_sessions').insert({ id: requestedSessionId, user_id: user.id, company_owner_id: companyOwnerId, app_source: 'web', user_agent: request.headers.get('user-agent')?.slice(0, 500) || null, last_seen_at: now, revoked_at: null });
        }

        const sessionToken = await new SignJWT({
            userId: user.id,
            email: user.email || '',
            role: 'owner',
            sid: requestedSessionId,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('24h')
            .sign(secret);

        const response = NextResponse.json({ success: true });
        response.cookies.set('session_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24,
            path: '/'
        });

        return response;

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[SyncSession] Error:', message);
        return NextResponse.json({ error: 'Internal server error', detail: message }, { status: 500 });
    }
}
