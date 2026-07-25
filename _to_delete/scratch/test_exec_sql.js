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

async function testRpc() {
    console.log("Testing if rpc('exec_sql') exists...");
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1;' });
    if (error) {
        console.log("rpc('exec_sql') failed/does not exist. Error:", error.message);
    } else {
        console.log("rpc('exec_sql') SUCCEEDED! Data:", data);
    }
}

testRpc();
