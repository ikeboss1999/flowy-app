const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function checkField(tableName, fieldName, value) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ id: 'schema-check', [fieldName]: value })
  });
  const data = await res.json().catch(() => ({}));
  if (data.code === 'PGRST204' && data.message.includes(fieldName)) {
    return false;
  }
  return true;
}

async function run() {
  const checks = [
    { table: 'customers', field: 'lastActivity', value: new Date().toISOString() },
    { table: 'customers', field: 'defaultPaymentTermId', value: 'test' },
    { table: 'employees', field: 'sharedFolders', value: [] },
    { table: 'employees', field: 'pendingChanges', value: {} },
    { table: 'projects', field: 'budget', value: 0 },
    { table: 'projects', field: 'paymentPlan', value: [] },
    { table: 'projects', field: 'diaryEntries', value: [] },
    { table: 'vehicles', field: 'userId', value: 'test' },
    { table: 'services', field: 'category', value: 'Other' }
  ];

  const missing = [];
  for (const check of checks) {
    const exists = await checkField(check.table, check.field, check.value);
    if (!exists) {
      missing.push(check);
    }
  }
  console.log(JSON.stringify(missing, null, 2));
}

run();
