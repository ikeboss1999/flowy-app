-- FlowY Mobile Integration Phase 2: mobile timesheet submission state.
-- Run this after phase 1. It keeps existing finalized/draft records intact.

alter table public.timesheets
add column if not exists "submittedAt" timestamptz;

do $$
begin
    if exists (
        select 1
        from information_schema.table_constraints
        where constraint_schema = 'public'
          and table_name = 'timesheets'
          and constraint_type = 'CHECK'
          and constraint_name = 'timesheets_status_check'
    ) then
        alter table public.timesheets
        drop constraint timesheets_status_check;
    end if;
end $$;

alter table public.timesheets
add constraint timesheets_status_check
check (status in ('draft', 'submitted', 'finalized'));

notify pgrst, 'reload schema';
