import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const baseUrl = process.env.MOBILE_TEST_BASE_URL || 'http://localhost:3000';
const companyOwnerId = process.env.MOBILE_TEST_COMPANY_ID || '68d8a0e4-411a-4efb-8e06-763e7a78eb7e';
const employeeId = process.env.MOBILE_TEST_EMPLOYEE_ID || 'uwpgl4uje';
const staffId = process.env.MOBILE_TEST_STAFF_ID || '66877990';
const projectId = process.env.MOBILE_TEST_PROJECT_ID || 'ebd66f08-0aad-4589-9559-be2e73ed7ca5';

async function loadLocalEnv() {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [key, ...rest] = trimmed.split('=');
    if (!process.env[key]) process.env[key] = rest.join('=').replace(/^["']|["']$/g, '');
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }
  return { status: response.status, body };
}

async function createActivationCode(client, code) {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await client
    .from('mobile_activation_codes')
    .update({ status: 'revoked', revokedAt: now, updatedAt: now })
    .eq('userId', companyOwnerId)
    .eq('employeeId', employeeId)
    .eq('status', 'active');

  const { error } = await client.from('mobile_activation_codes').insert({
    userId: companyOwnerId,
    employeeId,
    codeHash: await bcrypt.hash(code, 10),
    status: 'active',
    expiresAt,
    createdBy: 'phase3-test',
    createdAt: now,
    updatedAt: now,
  });
  if (error) throw error;
}

async function loginWithFreshCode(client, code = '246810') {
  await createActivationCode(client, code);
  const activate = await request('/api/mobile/v1/auth/activate', {
    method: 'POST',
    body: JSON.stringify({
      staffId,
      activationCode: code,
      pin: '123456',
      platform: 'phase3-test',
      deviceName: 'Phase3 Test',
      appVersion: '1.0.0',
    }),
  });
  if (activate.status !== 200) throw new Error(`Activation failed: ${activate.status} ${JSON.stringify(activate.body)}`);
  return activate.body.accessToken;
}

async function setDocumentPermission(client, enabled) {
  const { data, error } = await client
    .from('employees')
    .select('appAccess')
    .eq('userId', companyOwnerId)
    .eq('id', employeeId)
    .maybeSingle();
  if (error) throw error;

  const appAccess = data?.appAccess || {};
  const nextAppAccess = {
    ...appAccess,
    permissions: {
      ...(appAccess.permissions || {}),
      documents: enabled,
    },
  };
  const update = await client
    .from('employees')
    .update({ appAccess: nextAppAccess })
    .eq('userId', companyOwnerId)
    .eq('id', employeeId);
  if (update.error) throw update.error;
  return appAccess;
}

async function restoreAppAccess(client, appAccess) {
  const { error } = await client
    .from('employees')
    .update({ appAccess })
    .eq('userId', companyOwnerId)
    .eq('id', employeeId);
  if (error) throw error;
}

async function findFreeDate(client) {
  const today = new Date();
  for (let offset = 3; offset < 60; offset += 1) {
    const candidate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    const date = candidate.toISOString().slice(0, 10);
    const month = date.slice(0, 7);
    const timesheet = await client
      .from('timesheets')
      .select('status')
      .eq('userId', companyOwnerId)
      .eq('employeeId', employeeId)
      .eq('month', month)
      .maybeSingle();
    if (timesheet.error) throw timesheet.error;
    if (timesheet.data && timesheet.data.status !== 'draft') continue;

    const existing = await client
      .from('time_entries')
      .select('id')
      .eq('userId', companyOwnerId)
      .eq('employeeId', employeeId)
      .eq('date', date)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (!existing.data) return date;
  }
  throw new Error('No free draft date found for time-entry tests');
}

function assertStatus(results, name, response, expectedStatus) {
  const ok = response.status === expectedStatus;
  results.push({
    name,
    ok,
    status: response.status,
    expectedStatus,
    body: response.body,
  });
}

await loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase env vars');

const client = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const results = [];
let originalAppAccess = null;
let createdEntryId = null;

try {
  const token = await loginWithFreshCode(client);

  originalAppAccess = await setDocumentPermission(client, false);
  const docsWithDisabledLivePermission = await request('/api/mobile/v1/documents', { token });
  assertStatus(results, 'live module permission blocks stale access token', docsWithDisabledLivePermission, 403);
  await restoreAppAccess(client, originalAppAccess);
  originalAppAccess = null;

  const freeDate = await findFreeDate(client);
  const createEntry = await request('/api/mobile/v1/time-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: freeDate,
      startTime: '07:00',
      endTime: '16:00',
      breakDuration: 60,
      type: 'WORK',
      location: 'Phase 3 Test',
      projectId,
      duration: 999,
      overtime: 99,
      badWeatherDuration: 99,
    }),
  });
  assertStatus(results, 'time entry create ignores calculated client fields', createEntry, 201);
  createdEntryId = createEntry.body?.entry?.id || null;
  results.push({
    name: 'server-calculated time fields',
    ok: createEntry.body?.entry?.duration === 480 && createEntry.body?.entry?.overtime === 0 && createEntry.body?.entry?.badWeatherDuration === 0,
    status: createEntry.status,
    body: {
      duration: createEntry.body?.entry?.duration,
      overtime: createEntry.body?.entry?.overtime,
      badWeatherDuration: createEntry.body?.entry?.badWeatherDuration,
    },
  });

  const duplicateEntry = await request('/api/mobile/v1/time-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: freeDate,
      startTime: '08:00',
      endTime: '10:00',
      type: 'WORK',
    }),
  });
  assertStatus(results, 'duplicate employee date returns conflict', duplicateEntry, 409);

  const invalidTime = await request('/api/mobile/v1/time-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: freeDate,
      startTime: '25:99',
      endTime: '16:00',
      type: 'WORK',
    }),
  });
  assertStatus(results, 'invalid HH:mm returns bad request', invalidTime, 400);

  const endBeforeStart = await request('/api/mobile/v1/time-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: freeDate,
      startTime: '16:00',
      endTime: '07:00',
      type: 'WORK',
    }),
  });
  assertStatus(results, 'end before start returns bad request', endBeforeStart, 400);

  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const futureDate = await request('/api/mobile/v1/time-entries', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: future,
      startTime: '07:00',
      endTime: '16:00',
      type: 'WORK',
    }),
  });
  assertStatus(results, 'future date returns bad request', futureDate, 400);

  const diary = await request(`/api/mobile/v1/projects/${projectId}/diary`, { token });
  assertStatus(results, 'project diary GET works', diary, 200);
  const attachments = (diary.body?.entries || []).flatMap((entry) => entry.attachments || []);
  results.push({
    name: 'project diary attachments include signed urls when attachments exist',
    ok: attachments.length === 0 || attachments.every((attachment) => typeof attachment.url === 'string' && attachment.url.length > 0 && attachment.expiresIn === 600),
    status: diary.status,
    body: { attachmentCount: attachments.length, firstAttachmentHasUrl: attachments[0]?.url ? true : false },
  });

  const replayCode = '135790';
  await createActivationCode(client, replayCode);
  const [firstActivation, secondActivation] = await Promise.all([
    request('/api/mobile/v1/auth/activate', {
      method: 'POST',
      body: JSON.stringify({ staffId, activationCode: replayCode, pin: '123456', platform: 'phase3-race-a' }),
    }),
    request('/api/mobile/v1/auth/activate', {
      method: 'POST',
      body: JSON.stringify({ staffId, activationCode: replayCode, pin: '123456', platform: 'phase3-race-b' }),
    }),
  ]);
  const activationStatuses = [firstActivation.status, secondActivation.status].sort();
  results.push({
    name: 'parallel activation consumes code once',
    ok: activationStatuses[0] === 200 && activationStatuses[1] === 401,
    status: activationStatuses.join(','),
    body: { statuses: activationStatuses },
  });
} finally {
  if (createdEntryId) {
    await client
      .from('time_entries')
      .delete()
      .eq('userId', companyOwnerId)
      .eq('employeeId', employeeId)
      .eq('id', createdEntryId);
  }
  if (originalAppAccess) await restoreAppAccess(client, originalAppAccess);
}

console.log(JSON.stringify({
  success: results.every((result) => result.ok),
  results,
}, null, 2));
