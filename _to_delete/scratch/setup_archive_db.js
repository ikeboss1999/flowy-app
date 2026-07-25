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
  console.log('Connecting to Supabase to setup archive tables...');

  const sql_query = `
    CREATE TABLE IF NOT EXISTS archive_folders (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE("userId", "name")
    );

    CREATE TABLE IF NOT EXISTS archive_files (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "folder" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "storagePath" TEXT NOT NULL,
        "mimeType" TEXT,
        "size" INTEGER,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE archive_folders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE archive_files ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "own_archive_folders" ON archive_folders;
    CREATE POLICY "own_archive_folders" ON archive_folders FOR ALL USING ("userId" = auth.uid()::text);

    DROP POLICY IF EXISTS "own_archive_files" ON archive_files;
    CREATE POLICY "own_archive_files" ON archive_files FOR ALL USING ("userId" = auth.uid()::text);
  `;

  // Check if we can run via exec_sql
  const { data, error } = await supabase.rpc('exec_sql', { sql_query });

  if (error) {
    console.error('Note: exec_sql function not found, please execute the SQL statements in your Supabase SQL Editor manually.');
    console.log(sql_query);
    process.exit(1);
  }

  console.log('Archive tables and RLS policies created successfully!');
}

run();
