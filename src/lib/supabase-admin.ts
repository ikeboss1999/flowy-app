import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' })

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        },
        global: {
            fetch: noStoreFetch,
        },
    })
    : null

if (!supabaseAdmin) {
    console.warn('[SupabaseAdmin] WARNING: supabaseAdmin is null. Admin functions requiring service role will fail. Check SUPABASE_SERVICE_ROLE_KEY in .env.local');
}
