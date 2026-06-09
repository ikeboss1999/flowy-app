import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Public redirect endpoint: verifies session_token cookie server-side,
// then redirects to "/" if valid or "/welcome" if not.
// Used after login so navigation only proceeds once the cookie is confirmed.
export async function GET(request: NextRequest) {
    try {
        const sessionToken = request.cookies.get('session_token')?.value;
        const rawSecret = process.env.JWT_SECRET;

        if (sessionToken && rawSecret) {
            const secret = new TextEncoder().encode(rawSecret);
            await jwtVerify(sessionToken, secret);
            return NextResponse.redirect(new URL('/', request.url));
        }
    } catch {}

    return NextResponse.redirect(new URL('/welcome', request.url));
}
