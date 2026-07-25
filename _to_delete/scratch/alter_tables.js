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

const sql_query = `
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE order_confirmations ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE order_confirmations ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE crm_inquiries ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE crm_inquiries ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS updated_by TEXT;

  ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS created_by TEXT;
  ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS updated_by TEXT;
`;

async function alter() {
    console.log("Attempting to run SQL migration via RPC exec_sql...");
    const { data, error } = await supabase.rpc('exec_sql', { sql_query });

    if (error) {
        console.error("RPC exec_sql failed:", error.message);
    } else {
        console.log("Migration executed successfully! Result:", data);
    }
}

alter();
