import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Edge-compatible JWT verification (no bcryptjs dependency)
async function verifySessionTokenEdge(token: string): Promise<any | null> {
    try {
        const rawSecret = process.env.JWT_SECRET;
        if (!rawSecret) return null;
        const secret = new TextEncoder().encode(rawSecret);
        const { payload } = await jwtVerify(token, secret);
        return payload as { userId: string; email: string; role: string };
    } catch {
        return null;
    }
}

async function verifySupabaseToken(token: string): Promise<boolean> {
    try {
        const rawSupabaseSecret = process.env.SUPABASE_JWT_SECRET;
        if (!rawSupabaseSecret) return false;

        let secret: Uint8Array;
        if (rawSupabaseSecret.includes('/') || rawSupabaseSecret.includes('+') || rawSupabaseSecret.endsWith('=')) {
            try {
                const binaryString = atob(rawSupabaseSecret);
                secret = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    secret[i] = binaryString.charCodeAt(i);
                }
            } catch (e) {
                secret = new TextEncoder().encode(rawSupabaseSecret);
            }
        } else {
            secret = new TextEncoder().encode(rawSupabaseSecret);
        }

        await jwtVerify(token, secret);
        return true;
    } catch (e) {
        return false;
    }
}

export async function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const sbAccessToken = request.cookies.get('sb-access-token')?.value;

    const { pathname } = request.nextUrl;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    const isWelcomePage = pathname === '/welcome';
    const isApiRoute = pathname.startsWith('/api');
    const isPublicApi =
        pathname.startsWith('/api/auth') ||
        (pathname.startsWith('/api/partners') && request.method === 'GET');
    const isStaticFile = pathname.includes('.') || pathname.startsWith('/_next');

    // 1. Skip static files
    if (isStaticFile) return NextResponse.next();

    // Verify tokens cryptographically
    let isSessionValid = false;
    let isSbValid = false;

    if (sessionToken) {
        const payload = await verifySessionTokenEdge(sessionToken);
        if (payload) isSessionValid = true;
    }

    if (sbAccessToken) {
        isSbValid = await verifySupabaseToken(sbAccessToken);
    }

    const isAuthenticated = isSessionValid || isSbValid;
    console.log("[Middleware Debug]", {
        pathname,
        hasSessionToken: !!sessionToken,
        hasSbAccessToken: !!sbAccessToken,
        isSessionValid,
        isSbValid,
        isAuthenticated
    });

    // 2. Protect API Routes (except auth)
    if (isApiRoute) {
        if (!isPublicApi && !isAuthenticated) {
            console.warn(`[Middleware] Unauthorized API access to ${pathname}.`);
            return new NextResponse(
                JSON.stringify({
                    error: 'Unauthorized',
                    message: 'Valid session required'
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return NextResponse.next();
    }

    // 3. Protect UI Pages
    if (!isAuthenticated) {
        if (!isAuthPage && !isWelcomePage) {
            return NextResponse.redirect(new URL('/welcome', request.url));
        }
    } else {
        // Authenticated users on login/register go to the app home
        if (isAuthPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
