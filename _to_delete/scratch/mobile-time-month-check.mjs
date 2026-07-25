import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

const baseUrl = process.env.MOBILE_TEST_BASE_URL || 'http://localhost:3000';
const staffId = process.env.MOBILE_TEST_STAFF_ID || '66877990';
const pin = process.env.MOBILE_TEST_PIN || '123456';
const employeeId = process.env.MOBILE_TEST_EMPLOYEE_ID || 'uwpgl4uje';
const companyOwnerId = process.env.MOBILE_TEST_COMPANY_ID || '68d8a0e4-411a-4efb-8e06-763e7a78eb7e';

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body };
}

const login = await request('/api/mobile/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    staffId,
    pin,
    platform: 'month-check',
    deviceName: 'Month Check',
    appVersion: '1.0.0',
  }),
});

const token = login.body?.accessToken;
const months = ['2026-06', '2026-07'];
const api = {};
if (token) {
  for (const month of months) {
    api[month] = await request(`/api/mobile/v1/time-entries?month=${month}`, { token });
  }
}

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const db = {};
for (const month of months) {
  const [year, monthNumber] = month.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  const entries = await client
    .from('time_entries')
    .select('*')
    .eq('userId', companyOwnerId)
    .eq('employeeId', employeeId)
    .gte('date', `${month}-01`)
    .lte('date', monthEnd)
    .order('date', { ascending: true });
  db[month] = { data: entries.data, error: entries.error };
}

console.log(JSON.stringify({
  baseUrl,
  login: { status: login.status, ok: !!token },
  api,
  db,
}, null, 2));
