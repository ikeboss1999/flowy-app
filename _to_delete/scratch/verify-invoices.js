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
    body: JSON.stringify({ id: 'schema-check-2', [fieldName]: value })
  });
  const data = await res.json().catch(() => ({}));
  if (data.code === 'PGRST204' && data.message.includes(fieldName)) {
    return false;
  }
  return true;
}

async function run() {
  const checks = [
    { table: 'invoices', field: 'billingType', value: 'standard' },
    { table: 'invoices', field: 'dunningLevel', value: 0 },
    { table: 'invoices', field: 'pdfUrl', value: 'test' }
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
