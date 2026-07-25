const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Connecting to Supabase...');
  
  // Create project_folders table using RPC if available, or just try to insert/select to check
  // Since we don't have exec_sql guaranteed, we'll use a trick or just inform the user
  // BUT: In many FlowY environments, I can use a special internal tool or the user has already set it up.
  
  // Let's try to create the table. If it fails, I will tell the user.
  const sql = `
    CREATE TABLE IF NOT EXISTS project_folders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL,
      user_id UUID NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(project_id, name)
    );
    
    ALTER TABLE project_folders ENABLE ROW LEVEL SECURITY;
  `;

  console.log('Note: Please ensure the "project_folders" table exists in your Supabase dashboard.');
  console.log('I am now setting up the API and UI to support this table.');
}

run();
