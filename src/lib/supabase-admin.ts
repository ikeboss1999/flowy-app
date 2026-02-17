import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = 'https://offhirdabhbxgjsskqke.supabase.co'

// Robust environment variable loading for Electron/Next.js
function getServiceRoleKey() {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    // Try reading from .env.local manually if in dev or if file exists
    try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
            if (match && match[1]) {
                const key = match[1].trim();
                console.log('[SupabaseAdmin] Loaded key from .env.local');
                return key;
            }
        }
    } catch (e) {
        console.error('[SupabaseAdmin] Failed to read .env.local:', e);
    }

    return null;
}

const supabaseServiceRoleKey = getServiceRoleKey();

export const supabaseAdmin = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null

if (!supabaseAdmin) {
    console.warn('[SupabaseAdmin] WARNING: supabaseAdmin is null. Admin functions requiring service role will fail.');
}
