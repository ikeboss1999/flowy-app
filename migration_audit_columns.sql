-- SQL Migration: Add Audit Columns (created_by & updated_by) to FlowY tables.
-- Run this script in your Supabase SQL Editor if you want to enable audit log tracking.

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE settings ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE order_confirmations ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE order_confirmations ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE offers ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE crm_inquiries ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE crm_inquiries ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE archive_folders ADD COLUMN IF NOT EXISTS updated_by TEXT;

ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE archive_files ADD COLUMN IF NOT EXISTS updated_by TEXT;
