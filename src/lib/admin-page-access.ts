import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { supabaseAdmin } from './supabase-admin';

export async function isDeveloperPageRequest() {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    if (sessionToken && process.env.JWT_SECRET) {
        try {
            const { payload } = await jwtVerify(sessionToken, new TextEncoder().encode(process.env.JWT_SECRET));
            if (payload.role === 'developer') return true;
        } catch { /* Try the Supabase session below. */ }
    }
    const accessToken = cookieStore.get('sb-access-token')?.value;
    if (!accessToken || !supabaseAdmin) return false;
    const { data: userData } = await supabaseAdmin.auth.getUser(accessToken);
    if (!userData.user) return false;
    const { data: role } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userData.user.id).maybeSingle();
    return role?.role === 'developer' || userData.user.email === 'elsword.ie@gmail.com';
}
