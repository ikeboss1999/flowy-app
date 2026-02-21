import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { verifySessionToken } from './auth';

export async function getUserSession() {
    let cookieStore;
    try {
        cookieStore = cookies();
    } catch (e) {
        return null;
    }

    // 1. Try Supabase Session (Manual cookie check for reliability)
    const sbAccessToken = (await cookieStore).get('sb-access-token')?.value;
    if (sbAccessToken) {
        try {
            const { data: { user }, error } = await supabase.auth.getUser(sbAccessToken);
            if (user) {
                return {
                    userId: user.id,
                    email: user.email,
                    role: user.user_metadata?.role || 'user',
                    name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    accessToken: sbAccessToken
                };
            }
        } catch (e) {
            console.error('[AuthServer] Supabase session check failed:', e);
        }
    }

    // 2. Try Legacy session_token
    const token = (await cookieStore).get('session_token')?.value;
    if (token) {
        const payload = await verifySessionToken(token);
        if (payload) {
            return {
                ...payload,
                name: (payload as any).name || payload.email?.split('@')[0]
            };
        }
    }

    return null;
}

export async function checkAdmin() {
    const session = await getUserSession();
    if (session && session.role === 'admin') {
        return session;
    }
    return null;
}
