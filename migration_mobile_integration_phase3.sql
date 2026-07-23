-- FlowY Mobile Integration Phase 3: production hardening.
-- Run this after phase 1 and phase 2. Do not edit previously executed migrations.

create unique index if not exists employees_mobile_staff_id_unique_idx
on public.employees (("appAccess"->>'staffId'))
where "appAccess" ? 'staffId'
  and nullif("appAccess"->>'staffId', '') is not null;

create unique index if not exists time_entries_mobile_one_day_idx
on public.time_entries ("userId", "employeeId", date);

notify pgrst, 'reload schema';
