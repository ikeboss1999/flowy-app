import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getAppDataPath } from './datapath';

const dbDir = getAppDataPath();

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'flowy.db');
const logPath = path.join(dbDir, 'sqlite_debug.log');

const errorLogPath = path.join(dbDir, 'SQLITE_CRITICAL_ERROR.txt');

let db: Database.Database;

try {
  // Clear previous error log if exists
  if (fs.existsSync(errorLogPath)) {
    try { fs.unlinkSync(errorLogPath); } catch (e) { /* ignore */ }
  }

  // Attempt to open DB
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] Attempting to open DB at ${dbPath}\n`);
  // Log module path/version for debug
  fs.appendFileSync(logPath, `[DEBUG] Node Version: ${process.version}, Arch: ${process.arch}\n`);

  db = new Database(dbPath, { verbose: (msg) => fs.appendFileSync(logPath, `[SQL] ${msg}\n`) });
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB Opened Successfully\n`);

} catch (e: any) {
  const errorMsg = `[${new Date().toISOString()}] CRITICAL: Failed to open DB: ${e.message}\nSTACK: ${e.stack}\n`;
  console.error(errorMsg);

  // Force write to error file
  try {
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(errorLogPath, errorMsg);
  } catch (writeErr) {
    console.error("Failed to write error log:", writeErr);
  }

  // Re-throw is dangerous if it crashes the main process, but needed for API to fail
  throw e;
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    customerId TEXT,
    description TEXT,
    status TEXT,
    address TEXT, -- JSON string
    startDate TEXT,
    endDate TEXT,
    budget REAL,
    paymentPlan TEXT, -- JSON string
    createdAt TEXT,
    updatedAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT, -- JSON string
    createdAt TEXT,
    updatedAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoiceNumber TEXT NOT NULL,
    customerId TEXT,
    projectId TEXT,
    billingType TEXT,
    issueDate TEXT,
    items TEXT, -- JSON string
    subtotal REAL,
    taxRate REAL,
    taxAmount REAL,
    totalAmount REAL,
    status TEXT,
    paymentTerms TEXT,
    perfFrom TEXT,
    perfTo TEXT,
    processor TEXT,
    subjectExtra TEXT,
    partialPaymentNumber INTEGER,
    previousInvoices TEXT, -- JSON string
    dunningLevel INTEGER DEFAULT 0,
    lastDunningDate TEXT,
    dunningHistory TEXT, -- JSON string
    paidAmount REAL DEFAULT 0,
    paymentDeviation TEXT, -- JSON string
    notes TEXT,
    createdAt TEXT,
    updatedAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    userId TEXT PRIMARY KEY,
    companyData TEXT, -- JSON string
    accountSettings TEXT, -- JSON string
    invoiceSettings TEXT -- JSON string
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    basicInfo TEXT NOT NULL, -- JSON string
    fleetDetails TEXT NOT NULL, -- JSON string
    maintenance TEXT NOT NULL, -- JSON string
    leasing TEXT, -- JSON string
    documents TEXT, -- JSON string
    createdAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    employeeNumber TEXT NOT NULL,
    personalData TEXT NOT NULL, -- JSON string
    bankDetails TEXT NOT NULL, -- JSON string
    employment TEXT NOT NULL, -- JSON string
    additionalInfo TEXT, -- JSON string
    weeklySchedule TEXT, -- JSON string
    documents TEXT, -- JSON string
    avatar TEXT, -- Base64
    createdAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id TEXT PRIMARY KEY,
    employeeId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT,
    endTime TEXT,
    duration INTEGER,
    type TEXT,
    projectId TEXT,
    serviceId TEXT,
    description TEXT,
    userId TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS timesheets (
    id TEXT PRIMARY KEY,
    employeeId TEXT NOT NULL,
    month TEXT NOT NULL,
    status TEXT,
    finalizedAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    task TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    priority TEXT,
    createdAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT NOT NULL,
    isAllDay INTEGER DEFAULT 0,
    type TEXT,
    color TEXT,
    location TEXT,
    attendees TEXT, -- JSON string
    projectId TEXT,
    createdAt TEXT,
    userId TEXT
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    price REAL,
    unit TEXT,
    userId TEXT
  );
`);

export default db;
