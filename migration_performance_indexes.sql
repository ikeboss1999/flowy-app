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

-- 7. Single round-trip aggregation for the dashboard summary.
-- This function deliberately remains SECURITY INVOKER and is callable only by
-- the service-role backend, so a client cannot request another tenant's totals.
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_user_id text,
    p_year integer
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
    WITH invoice_summary AS (
        SELECT
            COALESCE(SUM(CASE WHEN status = 'paid' THEN "totalAmount" ELSE 0 END), 0) AS total_revenue,
            COALESCE(SUM(CASE WHEN status IN ('pending', 'overdue') THEN "totalAmount" ELSE 0 END), 0) AS open_amount,
            COUNT(*) FILTER (WHERE status IN ('pending', 'overdue')) AS open_count
        FROM public.invoices
        WHERE "userId" = p_user_id
          AND "issueDate" >= make_date(p_year, 1, 1)
          AND "issueDate" < make_date(p_year + 1, 1, 1)
    ),
    offer_summary AS (
        SELECT
            COUNT(*) FILTER (WHERE status = 'sent') AS open_count,
            COALESCE(SUM(CASE WHEN status = 'sent' THEN "totalAmount" ELSE 0 END), 0) AS open_amount
        FROM public.offers
        WHERE "userId" = p_user_id
          AND "issueDate" >= (p_year::text || '-01-01')
          AND "issueDate" < ((p_year + 1)::text || '-01-01')
    )
    SELECT jsonb_build_object(
        'year', p_year,
        'totalRevenue', invoice_summary.total_revenue,
        'openAmount', invoice_summary.open_amount,
        'openInvoicesCount', invoice_summary.open_count,
        'openOffersCount', offer_summary.open_count,
        'openOffersAmount', offer_summary.open_amount
    )
    FROM invoice_summary CROSS JOIN offer_summary;
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_summary(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(text, integer) TO service_role;
