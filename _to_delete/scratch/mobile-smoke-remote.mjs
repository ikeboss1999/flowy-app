const baseUrl = process.env.MOBILE_TEST_BASE_URL || 'http://192.168.0.253:3000';
const staffId = process.env.MOBILE_TEST_STAFF_ID || '66877990';
const pin = process.env.MOBILE_TEST_PIN || '123456';

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

const login = await request('/api/mobile/v1/auth/login', {
  method: 'POST',
  body: JSON.stringify({
    staffId,
    pin,
    platform: 'web-api-smoke',
    deviceName: 'Smoke Test',
    appVersion: '1.0.0',
  }),
});

if (login.status !== 200) {
  console.log(JSON.stringify({ login }, null, 2));
  process.exit(1);
}

const token = login.body.accessToken;
const [me, company, dashboard, documents, projects, timesheet] = await Promise.all([
  request('/api/mobile/v1/me', { token }),
  request('/api/mobile/v1/company', { token }),
  request('/api/mobile/v1/dashboard', { token }),
  request('/api/mobile/v1/documents', { token }),
  request('/api/mobile/v1/projects', { token }),
  request('/api/mobile/v1/timesheets/2026-07', { token }),
]);

console.log(JSON.stringify({
  baseUrl,
  login: { status: login.status, permissions: login.body.employee?.appAccess?.permissions },
  me: { status: me.status, employeeNumber: me.body.employee?.employeeNumber, permissions: me.body.permissions },
  company: { status: company.status, name: company.body.company?.name },
  dashboard: {
    status: dashboard.status,
    projectCount: dashboard.body.projects?.count,
    documentCount: dashboard.body.documents?.recent?.length,
    permissions: dashboard.body.permissions,
  },
  documents: {
    status: documents.status,
    folderCount: documents.body.folders?.length,
    documentCount: documents.body.documents?.length,
  },
  projects: {
    status: projects.status,
    projectCount: projects.body.projects?.length,
    projects: projects.body.projects,
  },
  timesheet: {
    status: timesheet.status,
    timesheet: timesheet.body.timesheet,
    totals: timesheet.body.totals,
  },
}, null, 2));
