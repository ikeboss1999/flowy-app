const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://offhirdabhbxgjsskqke.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZmhpcmRhYmhieGdqc3NrcWtlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDM0MDE1NywiZXhwIjoyMDg1OTE2MTU3fQ.Mpj1cSva1dsZdR16cHNH45CaDyhkBlWnSJg9gYtnVCs";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable(tableName) {
    try {
        const { data, error } = await supabase
            .rpc('get_table_columns_info', { t_name: tableName }); // Wait, maybe there's no custom RPC
        
        if (error) {
            // Fallback: Query a single row or use postgrest to get schema
            const { data: cols, error: err } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
            if (err) {
                console.error(`Error for ${tableName}:`, err.message);
            } else {
                console.log(`Table ${tableName} sample/columns:`, cols[0] ? Object.keys(cols[0]) : "No rows found");
            }
        } else {
            console.log(`Table ${tableName} columns:`, data);
        }
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    await checkTable('customers');
    await checkTable('employees');
    await checkTable('vehicles');
    await checkTable('projects');
    await checkTable('offers');
    await checkTable('invoices');
}

run();
