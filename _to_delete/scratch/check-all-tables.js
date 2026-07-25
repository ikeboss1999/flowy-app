const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

async function testTable(tableName, dummyData) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify(dummyData)
  });
  
  if (res.status === 404) return { error: "Table not found" };
  const data = await res.json().catch(() => ({}));
  if (data.code === 'PGRST204') {
    return { error: data.message };
  }
  return { success: true };
}

async function checkAll() {
  const results = {};

  results.customers = await testTable('customers', {
    id: "test", name: "test", type: "private", status: "active", email: "test", phone: "test",
    address: { street: "", city: "", zip: "" }, salutation: "", taxId: "", commercialRegisterNumber: "",
    reverseChargeEnabled: false, notes: "", defaultPaymentTermId: "", createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), lastActivity: "", userId: "test"
  });

  results.employees = await testTable('employees', {
    id: "test", employeeNumber: "1", personalData: {}, bankDetails: {}, employment: {},
    additionalInfo: {}, weeklySchedule: {}, documents: [], avatar: "", userId: "test",
    appAccess: {}, pendingChanges: {}, sharedFolders: [], createdAt: new Date().toISOString()
  });

  results.vehicles = await testTable('vehicles', {
    id: "test", basicInfo: {}, fleetDetails: {}, maintenance: {}, leasing: {},
    documents: [], createdAt: new Date().toISOString(), userId: "test"
  });

  results.projects = await testTable('projects', {
    id: "test", name: "test", customerId: "test", status: "planned", address: {},
    startDate: "", endDate: "", budget: 0, paymentPlan: [], diaryEntries: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: "test"
  });

  results.services = await testTable('services', {
    id: "test", userId: "test", title: "test", description: "", unit: "PA",
    price: 0, category: "Other", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });

  console.log(JSON.stringify(results, null, 2));
}

checkAll();
