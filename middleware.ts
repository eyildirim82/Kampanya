import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();
    const pathname = req.nextUrl.pathname;

    // 1. Admin Route Protection
    if (pathname.startsWith('/admin')) {
        // Allow public admin routes (login, forgot password, etc.)
        // Add any other public admin routes here if they exist
        if (pathname === '/admin/login') {
            return res;
        }

        // Check for Auth Token (Supabase)
        // We look for 'sb-access-token' which is set by adminLogin in actions.ts
        const accessToken = req.cookies.get('sb-access-token')?.value;
        const refreshToken = req.cookies.get('sb-refresh-token')?.value;

        if (!accessToken || !refreshToken) {
            // Redirect to login if no token
            const loginUrl = new URL('/admin/login', req.url);
            // Optional: Add ?next=pathname to redirect back after login
            loginUrl.searchParams.set('next', pathname);
            return NextResponse.redirect(loginUrl);
        }

        // Token exists. 
        // Note: We don't verify the token signature here for performance (Edge).
        // The actual data fetching in the page/action will verify it against Supabase.
        // This middleware is just for UX/Routing protection.
    }

    return res;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public (public files)
         */
        '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
    ],
};
