-- FlowY Performance Optimization Migration: Composite Indexes
-- Run this in Supabase SQL Editor (SQL Query Runner) for instant query acceleration.

-- 1. Index for fast time entries lookups by company/employee and date
CREATE INDEX IF NOT EXISTS idx_time_entries_user_employee_date 
ON public.time_entries ("userId", "employeeId", date DESC);

-- 2. Index for invoice queries by status and issue date
CREATE INDEX IF NOT EXISTS idx_invoices_user_status_date 
ON public.invoices ("userId", status, "issueDate" DESC);

-- 3. Index for offer queries by status and issue date
CREATE INDEX IF NOT EXISTS idx_offers_user_status_date 
ON public.offers ("userId", status, "issueDate" DESC);

-- 4. Index for order confirmation queries
CREATE INDEX IF NOT EXISTS idx_orders_user_status_date 
ON public.order_confirmations ("userId", status, "issueDate" DESC);

-- 5. Index for active project lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_status_created 
ON public.projects ("userId", status, "createdAt" DESC);

-- 6. Index for fast customer searching by user
CREATE INDEX IF NOT EXISTS idx_customers_user_status_created 
ON public.customers ("userId", status, "createdAt" DESC);
