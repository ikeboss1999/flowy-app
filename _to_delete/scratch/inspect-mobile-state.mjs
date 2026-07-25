import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

const serviceClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const anonClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

const employeeId = process.env.MOBILE_TEST_EMPLOYEE_ID || 'uwpgl4uje';
const month = process.env.MOBILE_TEST_MONTH || '2026-07';

async function inspectWith(client, label) {
const assignments = await client
  .from('project_assignments')
  .select('id,userId,employeeId,projectId,status,createdAt,updatedAt')
  .eq('employeeId', employeeId)
  .order('createdAt', { ascending: false });

const timesheets = await client
  .from('timesheets')
  .select('*')
  .eq('employeeId', employeeId)
  .eq('month', month);

return {
  label,
  employeeId,
  month,
  projectAssignments: assignments.data,
  projectAssignmentsError: assignments.error,
  timesheets: timesheets.data,
  timesheetsError: timesheets.error,
};
}

console.log(JSON.stringify({
  service: await inspectWith(serviceClient, 'service'),
  anon: await inspectWith(anonClient, 'anon'),
}, null, 2));
