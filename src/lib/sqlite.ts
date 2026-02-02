import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file path
// In development, it's in the project root.
// In production, we'll need to handle it properly, but for now:
const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'flowy.db');
const db = new Database(dbPath);

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
