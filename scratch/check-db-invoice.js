const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8');
const SUPABASE_URL = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_KEY = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
  method: 'POST',
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  },
  body: JSON.stringify({
    id: "test",
    invoiceNumber: "test",
    issueDate: "2026-05-10",
    paymentTerms: "test",
    customerId: "test",
    customerName: "test",
    processor: "test",
    items: [],
    subtotal: 0,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 0,
    status: "draft",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: "test",
    paymentDeviation: {},
    projectId: "test",
    paymentPlanItemId: "test",
    billingType: "standard",
    partialPaymentNumber: 1,
    previousInvoices: [],
    dunningLevel: 0,
    lastDunningDate: "2026-05-10",
    dunningHistory: [],
    pdfUrl: "test",
    subjectExtra: "test",
    constructionProject: "test",
    performancePeriod: {}
  })
})
.then(res => res.json())
.then(console.log)
.catch(console.error);
