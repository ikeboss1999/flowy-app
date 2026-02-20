import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get('session_token')?.value;
    const sbAccessToken = request.cookies.get('sb-access-token')?.value;

    const { pathname } = request.nextUrl;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');
    const isWelcomePage = pathname === '/welcome' || pathname === '/';
    const isApiRoute = pathname.startsWith('/api');
    const isPublicApi = pathname.startsWith('/api/auth') || (pathname.startsWith('/api/partners') && request.method === 'GET');
    const isStaticFile = pathname.includes('.') || pathname.startsWith('/_next');

    // 1. Skip static files
    if (isStaticFile) return NextResponse.next();

    // 2. Protect API Routes (except auth)
    if (isApiRoute) {
        if (!isPublicApi && !sessionToken && !sbAccessToken) {
            return new NextResponse(
                JSON.stringify({ error: 'Unauthorized', message: 'Valid session required' }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }
        return NextResponse.next();
    }

    // 3. Protect UI Pages
    const isAuthenticated = !!(sessionToken || sbAccessToken);

    if (!isAuthenticated) {
        // Redirect to welcome if trying to access protected UI
        if (!isAuthPage && !isWelcomePage) {
            return NextResponse.redirect(new URL('/welcome', request.url));
        }
    } else {
        // Redirect to dashboard if logged in and trying to access auth pages
        if (isAuthPage) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
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
