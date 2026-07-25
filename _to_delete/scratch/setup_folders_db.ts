import { supabaseAdmin } from './src/lib/supabase-admin';

async function setupFoldersTable() {
  if (!supabaseAdmin) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
    return;
  }

  console.log('Creating project_folders table...');
  
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql_query: `
      CREATE TABLE IF NOT EXISTS project_folders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(project_id, name)
      );

      -- Enable RLS
      ALTER TABLE project_folders ENABLE ROW LEVEL SECURITY;

      -- Add policies (though we usually use service role for API)
      DROP POLICY IF EXISTS "Users can see their own project folders" ON project_folders;
      CREATE POLICY "Users can see their own project folders" ON project_folders
        FOR SELECT USING (auth.uid() = user_id);

      DROP POLICY IF EXISTS "Users can manage their own project folders" ON project_folders;
      CREATE POLICY "Users can manage their own project folders" ON project_folders
        FOR ALL USING (auth.uid() = user_id);
    `
  });

  if (error) {
    // Fallback if rpc exec_sql is not available
    console.warn('RPC exec_sql failed or not available, trying direct query (if possible)...');
    console.error(error);
  } else {
    console.log('Table project_folders created successfully.');
  }
}

setupFoldersTable();
