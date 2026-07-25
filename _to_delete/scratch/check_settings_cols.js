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

async function check() {
    const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error reading settings table:", error);
    } else {
        console.log("Settings record data keys/columns:", data.length > 0 ? Object.keys(data[0]) : "No records found");
        if (data.length > 0) {
            console.log("Sample record:", JSON.stringify(data[0], null, 2));
        }
    }
    
    const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .limit(1);
        
    if (customersError) {
        console.error("Error reading customers table:", customersError);
    } else {
        console.log("Customers record columns:", customersData.length > 0 ? Object.keys(customersData[0]) : "No records found");
        if (customersData.length > 0) {
            console.log("Sample customer:", JSON.stringify(customersData[0], null, 2));
        }
    }
}

check();
