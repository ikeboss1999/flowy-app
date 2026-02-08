
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://offhirdabhbxgjsskqke.supabase.co'
// This key should NEVER be exposed on the client side.
// It is only used in server-side routes.
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null
