const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://offhirdabhbxgjsskqke.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZmhpcmRhYmhieGdqc3NrcWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM0MDE1NywiZXhwIjoyMDg1OTE2MTU3fQ.Mpj1cSva1dsZdR16cHNH45CaDyhkBlWnSJg9gYtnVCs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConstraints() {
    try {
        const query = `
            SELECT table_name, column_name, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name IN ('customers', 'employees', 'vehicles', 'projects', 'offers', 'invoices')
              AND is_nullable = 'NO'
              AND column_default IS NULL;
        `;
        
        // We can execute raw SQL using a postgres query or some endpoint, or we can check via api or just postgrest
        // Wait, postgrest doesn't let us run arbitrary SQL queries unless we have an RPC function or query info schema.
        // Let's see if we can query information_schema via postgrest. By default, postgrest exposes only tables in api-visible schemas, but sometimes information_schema is not visible. Let's try.
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .limit(1);
        
        // If we can't run the query, let's write a node script that uses pg/postgres library if installed, but wait, do we have pg installed?
        // Let's look at package.json dependencies. No, we have only supabase-js, lucide-react, etc.
        // Wait! We can try to insert a completely empty record with just ID and userId to see which database validation fails! That is a very direct way to see what columns are NOT NULL!
    } catch (e) {
        console.error(e);
    }
}

async function testInsert(tableName, dummyData) {
    console.log(`Testing insert for ${tableName}...`);
    const { data, error } = await supabase.from(tableName).insert(dummyData).select();
    if (error) {
        console.log(`❌ ${tableName} insert failed:`, error.message);
    } else {
        console.log(`✅ ${tableName} insert succeeded! Row:`, data[0]);
        // Delete it immediately
        await supabase.from(tableName).delete().eq('id', dummyData.id);
    }
}

async function run() {
    const dummyId = "00000000-0000-0000-0000-000000000000"; // Or nanoid
    const userId = "45bb42ec-a0cc-4b7f-b677-2f3b9247d570"; // Let's use a real user id if we want, or a mock UUID. Wait, companyOwnerId is needed.
    
    // Let's check a sample customer row first to find a valid userId.
    const { data: samples } = await supabase.from('customers').select('userId').limit(1);
    const validUserId = samples && samples[0] ? samples[0].userId : dummyId;
    console.log("Using userId:", validUserId);

    await testInsert('customers', { id: 'test-draft-id-123', userId: validUserId, name: 'Test Draft Customer' });
    await testInsert('employees', { id: 'test-draft-id-123', userId: validUserId, employeeNumber: 'TEST-123' });
    await testInsert('vehicles', { id: 'test-draft-id-123', userId: validUserId });
    await testInsert('projects', { id: 'test-draft-id-123', userId: validUserId, name: 'Test Draft Project' });
    await testInsert('offers', { id: 'test-draft-id-123', userId: validUserId, offerNumber: 'TEST-OFFER-123' });
    await testInsert('invoices', { id: 'test-draft-id-123', userId: validUserId, invoiceNumber: 'TEST-INVOICE-123' });
}

run();
