import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { verifySessionToken } from './auth';

export async function checkAdmin() {
    let cookieStore;
    try {
        cookieStore = cookies();
    } catch (e) {
        console.error('[AuthServer] Failed to access cookies:', e);
        return null;
    }

    // 1. Try Supabase Session (Modern)
    // We try to get the user. In Next.js, this usually requires the cookies to be present.
    // If the standard client doesn't see them, we might need to manually check.
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('[AuthServer] getUser result:', {
            hasUser: !!user,
            email: user?.email,
            role: user?.user_metadata?.role,
            error: error?.message
        });

        if (user && user.user_metadata?.role === 'admin') {
            return { userId: user.id, email: user.email, role: 'admin' };
        }
    } catch (e) {
        console.error('[AuthServer] Supabase getUser exception:', e);
    }

    // 2. Try Legacy session_token (Backward Compatibility)
    const token = (await cookieStore).get('session_token')?.value;
    if (token) {
        console.log('[AuthServer] Found session_token, verifying...');
        const payload = await verifySessionToken(token);
        console.log('[AuthServer] verifySessionToken result:', { hasPayload: !!payload, role: payload?.role });
        if (payload && payload.role === 'admin') return payload;
    } else {
        console.log('[AuthServer] No session_token found in cookies.');
    }

    // 3. Try to find Supabase cookie manually
    const sbAccessToken = (await cookieStore).get('sb-access-token')?.value;
    if (sbAccessToken) {
        console.log('[AuthServer] Found sb-access-token cookie, attempting to set session...');
        try {
            const { data: { user }, error } = await supabase.auth.getUser(sbAccessToken);
            console.log('[AuthServer] getUser with token result:', {
                hasUser: !!user,
                email: user?.email,
                role: user?.user_metadata?.role,
                error: error?.message
            });

            if (user && user.user_metadata?.role === 'admin') {
                return { userId: user.id, email: user.email, role: 'admin' };
            }
        } catch (e) {
            console.error('[AuthServer] getUser with token exception:', e);
        }
    }

    const allCookies = (await cookieStore).getAll();
    console.log('[AuthServer] No valid admin session found. Available cookies:', allCookies.map(c => c.name));

    return null;
}
