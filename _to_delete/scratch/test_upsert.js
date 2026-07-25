const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse env
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
const supabase = createClient(supabaseUrl, supabaseKey);

// Simulated safeUpsert function
async function safeUpsert(client, table, data) {
    const { error, data: result } = await client
        .from(table)
        .upsert(data);

    if (error && (
        error.message.includes('created_by') || 
        error.message.includes('updated_by') || 
        error.code === 'PGRST204' || 
        error.code === '42703'
    )) {
        console.warn(`[SupabaseHelper] Upsert to "${table}" failed due to missing audit columns. Retrying...`);
        const { created_by, updated_by, ...cleanedData } = data;
        return await client
            .from(table)
            .upsert(cleanedData);
    }

    return { error, data: result };
}

async function simulatePost() {
    const { data: userRoles, error: urError } = await supabase
        .from('user_roles')
        .select('*')
        .limit(1);

    if (urError) {
        console.error("Error reading user_roles:", urError);
        return;
    }

    if (userRoles.length === 0) {
        console.log("No user roles found. Cannot simulate POST.");
        return;
    }

    const testRole = userRoles[0];
    const session = {
        userId: testRole.user_id,
        companyOwnerId: testRole.company_owner_id,
        role: testRole.role
    };

    console.log("Using simulated session:", session);

    const customer = {
        id: 'test-uuid-999999',
        type: 'private',
        status: 'active',
        salutation: 'Herr',
        name: 'Simulated API Customer',
        email: 'simulated@example.com',
        phone: '1234567890',
        address: {
            street: 'Mustergasse 12',
            city: 'Graz',
            zip: '8010'
        },
        notes: 'Simulated via API script',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString()
    };

    try {
        const customerId = customer.id;
        const now = new Date().toISOString();

        const customerData = {
            ...customer,
            id: customerId,
            userId: session.companyOwnerId,
            updatedAt: now,
            updated_by: session.userId,
            created_by: session.userId
        };

        console.log("Upserting customer data with simulated safeUpsert...");
        const { error: insertError } = await safeUpsert(supabase, 'customers', customerData);

        if (insertError) {
            console.error("UPSERT ERROR:", insertError);
        } else {
            console.log("✅ UPSERT SUCCESS WITH RESILIENT FALLBACK!");
            
            // clean up
            const { error: deleteError } = await supabase
                .from('customers')
                .delete()
                .eq('id', customerId);
            console.log("Cleaned up. Delete error:", deleteError);
        }
    } catch (e) {
        console.error("Catch block error:", e);
    }
}

simulatePost();
