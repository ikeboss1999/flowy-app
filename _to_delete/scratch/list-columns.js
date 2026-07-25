const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function getColumns(tableName) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*&limit=1`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`
    }
  });
  const data = await res.json();
  if (data.length > 0) {
    return Object.keys(data[0]);
  }
  return [];
}

async function run() {
  const tables = ['customers', 'employees', 'vehicles', 'projects', 'services'];
  const results = {};
  for (const table of tables) {
    results[table] = await getColumns(table);
  }
  console.log(JSON.stringify(results, null, 2));
}

run();
