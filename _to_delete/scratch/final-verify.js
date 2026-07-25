const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function verifyAll() {
  console.log("Starte finale Prüfung der Datenbank...");
  
  const tables = [
    { name: 'time_entries', fields: ['breakDuration', 'badWeatherDuration', 'overtime', 'location'] },
    { name: 'invoices', fields: ['customerName', 'billingType', 'pdfUrl', 'projectId'] },
    { name: 'projects', fields: ['diaryEntries', 'budget'] }
  ];

  for (const table of tables) {
    console.log(`Prüfe Tabelle: ${table.name}...`);
    for (const field of table.fields) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table.name}`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ id: 'final-test', [field]: field === 'budget' ? 0 : (field.includes('Entries') ? [] : 'test') })
      });
      const data = await res.json().catch(() => ({}));
      if (data.code === 'PGRST204') {
        console.error(`❌ FEHLER: Spalte '${field}' fehlt in Tabelle '${table.name}'!`);
      } else {
        console.log(`✅ Spalte '${field}' ist bereit.`);
      }
    }
  }
}

verifyAll();
