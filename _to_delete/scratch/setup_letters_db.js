const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
const envFile = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (key && value) env[key] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Connecting to Supabase to setup letters table...');

  const sql_query = `
    CREATE TABLE IF NOT EXISTS letters (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "customerId" TEXT REFERENCES customers(id) ON DELETE SET NULL,
        "recipientName" TEXT NOT NULL,
        "recipientAddress" TEXT NOT NULL,
        "date" DATE NOT NULL DEFAULT CURRENT_DATE,
        "city" TEXT NOT NULL DEFAULT 'Wien',
        "subject" TEXT NOT NULL,
        "salutation" TEXT NOT NULL,
        "bodyText" TEXT NOT NULL,
        "signOff" TEXT NOT NULL DEFAULT 'Mit freundlichen Grüßen',
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "own_letters" ON letters;
    CREATE POLICY "own_letters" ON letters 
        FOR ALL USING ("userId" = auth.uid()::text);
  `;

  const { data, error } = await supabase.rpc('exec_sql', { sql_query });

  if (error) {
    console.error('Failed to create letters table:', error);
    process.exit(1);
  }

  console.log('Letters table and RLS policies created successfully!');
}

run();
