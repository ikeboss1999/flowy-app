import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const accessToken = body.access_token;

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

        const rawSecret = process.env.JWT_SECRET;
        if (!rawSecret) {
            return NextResponse.json({ error: 'Server config error', detail: 'Missing JWT_SECRET' }, { status: 500 });
        }

        const secret = new TextEncoder().encode(rawSecret);
        const sessionToken = await new SignJWT({
            userId: user.id,
            email: user.email || '',
            role: 'owner'
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
