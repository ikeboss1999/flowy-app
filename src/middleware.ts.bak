import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Reusing secret from auth.ts, but can't import node modules in edge middleware easily
// So validation here is check existence, or duplicate constant.
// Better: just check existence of cookie for redirection speed, 
// and let API/Server Components do real validation.
// However, to block access to protected routes effectively, we should valid structure if possible.
// For now, strict cookie check.

export function middleware(request: NextRequest) {
    const sessionToken = request.cookies.get('session_token')?.value;

    const isAuthPage =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/register') ||
        request.nextUrl.pathname.startsWith('/forgot-password') ||
        request.nextUrl.pathname.startsWith('/reset-password') ||
        request.nextUrl.pathname.startsWith('/verify');

    const isApiRoute = request.nextUrl.pathname.startsWith('/api');
    const isStatic = request.nextUrl.pathname.includes('.'); // images, css, etc.

    if (isApiRoute || isStatic) {
        return NextResponse.next();
    }

    // If user is authenticated
    if (sessionToken) {
        // If trying to access auth pages (login/register), redirect to dashboard
        if (isAuthPage) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    } else {
        // If not authenticated and trying to access protected pages (everything else)
        if (!isAuthPage) {
            return NextResponse.redirect(new URL('/login', request.url));
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
