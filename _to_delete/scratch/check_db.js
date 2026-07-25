const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing env variables in parsed file!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Connecting to:", supabaseUrl);
    
    // 1. Get a single customer
    const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (customerError) {
        console.error("Error fetching customer:", customerError);
    } else {
        console.log("Customer table row example:", customers);
    }

    // 2. Try inserting a test customer
    const testCustomer = {
        id: 'test-uuid-123456',
        type: 'private',
        status: 'active',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '12345',
        address: { street: 'Main St', city: 'Vienna', zip: '1010' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        userId: '172a2979-5fa2-432d-9447-e16104bc6e8b' // We need a valid user ID or skip it if RLS isn't blocking admin
    };

    const { data: insertData, error: insertError } = await supabase
        .from('customers')
        .insert(testCustomer);

    if (insertError) {
        console.error("Error inserting test customer:", insertError);
    } else {
        console.log("Insert success:", insertData);
        // clean up
        await supabase.from('customers').delete().eq('id', 'test-uuid-123456');
    }
}

main();
