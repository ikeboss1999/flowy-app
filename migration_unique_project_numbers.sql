-- FlowY: prevent duplicate project numbers inside the same company.
-- Run this in the Supabase SQL Editor before deploying the matching application code.

CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_user_project_number_unique
ON public.projects ("userId", "projectNumber")
WHERE "projectNumber" IS NOT NULL AND "projectNumber" <> '';
