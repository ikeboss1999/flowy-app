const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        env[key] = val;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const tables = [
    'vehicles',
    'settings',
    'projects',
    'order_confirmations',
    'offers',
    'invoices',
    'employees',
    'crm_inquiries',
    'customers',
    'archive_folders',
    'archive_files'
];

async function check() {
    for (const table of tables) {
        const { data, error } = await supabase
            .from(table)
            .select('created_by')
            .limit(1);

        if (error) {
            console.log(`❌ Table "${table}" DOES NOT have "created_by". Error:`, error.message);
        } else {
            console.log(`✅ Table "${table}" has "created_by".`);
        }
    }
}

check();
