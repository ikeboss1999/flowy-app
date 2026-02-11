import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { getAppDataPath } from './datapath';

const dbDir = getAppDataPath();
const dbPath = path.join(dbDir, 'flowy.db');
const logPath = path.join(dbDir, 'sqlite_debug.log');
const errorLogPath = path.join(dbDir, 'SQLITE_CRITICAL_ERROR.txt');

// Lazy instance
let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) return dbInstance;

  try {
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Clear previous error log if exists
    if (fs.existsSync(errorLogPath)) {
      try { fs.unlinkSync(errorLogPath); } catch (e) { /* ignore */ }
    }

    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Opening DB at ${dbPath}\n`);

    dbInstance = new Database(dbPath, {
      verbose: (msg) => {
        try { fs.appendFileSync(logPath, `[SQL] ${msg}\n`); } catch (e) { }
      }
    });

    fs.appendFileSync(logPath, `[${new Date().toISOString()}] DB Opened Successfully\n`);

    initSchema(dbInstance);

    return dbInstance;
  } catch (e: any) {
    const errorMsg = `[${new Date().toISOString()}] CRITICAL: Failed to open DB: ${e.message}\nSTACK: ${e.stack}\n`;
    console.error(errorMsg);
    try { fs.writeFileSync(errorLogPath, errorMsg); } catch (w) { }
    throw e;
  }
}

function initSchema(db: Database.Database) {
  db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            customerId TEXT,
            description TEXT,
            status TEXT,
            address TEXT,
            startDate TEXT,
            endDate TEXT,
            budget REAL,
            paymentPlan TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            type TEXT,
            status TEXT,
            salutation TEXT,
            taxId TEXT,
            commercialRegisterNumber TEXT,
            reverseChargeEnabled INTEGER DEFAULT 0,
            defaultPaymentTermId TEXT,
            notes TEXT,
            lastActivity TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS invoices (
            id TEXT PRIMARY KEY,
            invoiceNumber TEXT NOT NULL,
            customerId TEXT,
            projectId TEXT,
            constructionProject TEXT,
            paymentPlanItemId TEXT,
            billingType TEXT,
            issueDate TEXT,
            items TEXT,
            subtotal REAL,
            taxRate REAL,
            taxAmount REAL,
            totalAmount REAL,
            isReverseCharge INTEGER DEFAULT 0,
            status TEXT,
            paymentTerms TEXT,
            perfFrom TEXT,
            perfTo TEXT,
            processor TEXT,
            subjectExtra TEXT,
            partialPaymentNumber INTEGER,
            previousInvoices TEXT,
            dunningLevel INTEGER DEFAULT 0,
            lastDunningDate TEXT,
            dunningHistory TEXT,
            paidAmount REAL DEFAULT 0,
            paymentDeviation TEXT,
            notes TEXT,
            createdAt TEXT,
            updatedAt TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
            userId TEXT PRIMARY KEY,
            companyData TEXT,
            accountSettings TEXT,
            invoiceSettings TEXT
        );

        CREATE TABLE IF NOT EXISTS vehicles (
            id TEXT PRIMARY KEY,
            basicInfo TEXT NOT NULL,
            fleetDetails TEXT NOT NULL,
            maintenance TEXT NOT NULL,
            leasing TEXT,
            documents TEXT,
            createdAt TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            employeeNumber TEXT NOT NULL,
            personalData TEXT NOT NULL,
            bankDetails TEXT NOT NULL,
            employment TEXT NOT NULL,
            additionalInfo TEXT,
            weeklySchedule TEXT,
            documents TEXT,
            avatar TEXT,
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
            overtime REAL,
            location TEXT,
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
            attendees TEXT,
            projectId TEXT,
            startTime TEXT,
            endTime TEXT,
            createdAt TEXT,
            userId TEXT
        );

        CREATE TABLE IF NOT EXISTS services (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            title TEXT,
            description TEXT,
            category TEXT,
            price REAL,
            unit TEXT,
            userId TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            passwordHash TEXT NOT NULL,
            name TEXT,
            role TEXT DEFAULT 'user',
            isVerified INTEGER DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        );

        CREATE TABLE IF NOT EXISTS tokens (
            id TEXT PRIMARY KEY,
            userId TEXT,
            token TEXT,
            type TEXT,
            expiresAt INTEGER,
            createdAt TEXT
        );
    `);

  // Migrations
  try {
    const columns = db.prepare("PRAGMA table_info(time_entries)").all();
    const columnNames = columns.map((c: any) => c.name);

    if (!columnNames.includes('overtime')) {
      db.prepare("ALTER TABLE time_entries ADD COLUMN overtime REAL").run();
    }
    if (!columnNames.includes('location')) {
      db.prepare("ALTER TABLE time_entries ADD COLUMN location TEXT").run();
    }

    const calColumns = db.prepare("PRAGMA table_info(calendar_events)").all();
    const calColumnNames = calColumns.map((c: any) => c.name);
    if (!calColumnNames.includes('startTime')) {
      db.prepare("ALTER TABLE calendar_events ADD COLUMN startTime TEXT").run();
    }
    if (!calColumnNames.includes('endTime')) {
      db.prepare("ALTER TABLE calendar_events ADD COLUMN endTime TEXT").run();
    }

    const custColumns = db.prepare("PRAGMA table_info(customers)").all();
    const custColumnNames = custColumns.map((c: any) => c.name);
    const missingCustCols = [
      ['type', 'TEXT'],
      ['status', 'TEXT'],
      ['salutation', 'TEXT'],
      ['taxId', 'TEXT'],
      ['commercialRegisterNumber', 'TEXT'],
      ['reverseChargeEnabled', 'INTEGER DEFAULT 0'],
      ['defaultPaymentTermId', 'TEXT'],
      ['notes', 'TEXT'],
      ['lastActivity', 'TEXT']
    ];

    for (const [col, type] of missingCustCols) {
      if (!custColumnNames.includes(col)) {
        db.prepare(`ALTER TABLE customers ADD COLUMN ${col} ${type}`).run();
      }
    }

    const invColumns = db.prepare("PRAGMA table_info(invoices)").all();
    const invColumnNames = invColumns.map((c: any) => c.name);
    const missingInvCols = [
      ['constructionProject', 'TEXT'],
      ['paymentPlanItemId', 'TEXT'],
      ['isReverseCharge', 'INTEGER DEFAULT 0']
    ];

    for (const [col, type] of missingInvCols) {
      if (!invColumnNames.includes(col)) {
        db.prepare(`ALTER TABLE invoices ADD COLUMN ${col} ${type}`).run();
      }
    }

    const svcColumns = db.prepare("PRAGMA table_info(services)").all();
    const svcColumnNames = svcColumns.map((c: any) => c.name);
    const missingSvcCols = [
      ['title', 'TEXT'],
      ['createdAt', 'TEXT'],
      ['updatedAt', 'TEXT']
    ];

    for (const [col, type] of missingSvcCols) {
      if (!svcColumnNames.includes(col)) {
        db.prepare(`ALTER TABLE services ADD COLUMN ${col} ${type}`).run();
      }
    }
  } catch (e) {
    console.error("Migration failed", e);
  }
}

// Proxy wrapper
const db = {
  prepare: (sql: string) => getDb().prepare(sql),
  transaction: (fn: any) => getDb().transaction(fn),
  exec: (sql: string) => getDb().exec(sql),
};

export default db;
