-- FlowY security phase 1: RLS, tenant policies, private storage policies and core indexes.
-- Run this once in the Supabase SQL editor after deploying the API-side tenant checks.
-- The script is intentionally defensive: it only applies policies to tables that exist.

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    company_owner_id uuid not null references auth.users(id) on delete cascade,
    role text not null default 'admin' check (role in ('developer', 'admin', 'employee')),
    permissions jsonb not null default '{}'::jsonb,
    status text not null default 'active' check (status in ('active', 'pending', 'disabled')),
    invited_by uuid references auth.users(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table if exists public.user_roles
add column if not exists id uuid default gen_random_uuid();

alter table if exists public.user_roles
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table if exists public.user_roles
add column if not exists company_owner_id uuid references auth.users(id) on delete cascade;

alter table if exists public.user_roles
add column if not exists role text default 'admin';

alter table if exists public.user_roles
add column if not exists permissions jsonb default '{}'::jsonb;

alter table if exists public.user_roles
add column if not exists status text default 'active';

alter table if exists public.user_roles
add column if not exists invited_by uuid references auth.users(id);

alter table if exists public.user_roles
add column if not exists created_at timestamptz default now();

alter table if exists public.user_roles
add column if not exists updated_at timestamptz default now();

create unique index if not exists user_roles_user_id_unique_idx
on public.user_roles (user_id);

create index if not exists user_roles_company_owner_id_idx
on public.user_roles (company_owner_id);

create or replace function public.flowy_current_company_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (
            select ur.company_owner_id
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and coalesce(ur.status, 'active') = 'active'
            limit 1
        ),
        auth.uid()
    );
$$;

create or replace function public.flowy_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
    select coalesce(
        (
            select ur.role
            from public.user_roles ur
            where ur.user_id = auth.uid()
              and coalesce(ur.status, 'active') = 'active'
            limit 1
        ),
        'admin'
    );
$$;

create or replace function public.flowy_is_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select public.flowy_current_role() = 'developer';
$$;

grant execute on function public.flowy_current_company_owner_id() to authenticated;
grant execute on function public.flowy_current_role() to authenticated;
grant execute on function public.flowy_is_developer() to authenticated;

alter table public.user_roles enable row level security;

drop policy if exists flowy_user_roles_select on public.user_roles;
create policy flowy_user_roles_select
on public.user_roles
for select
using (
    user_id = auth.uid()
    or public.flowy_is_developer()
    or (
        public.flowy_current_role() = 'admin'
        and company_owner_id = public.flowy_current_company_owner_id()
    )
);

drop policy if exists flowy_user_roles_insert on public.user_roles;
create policy flowy_user_roles_insert
on public.user_roles
for insert
with check (
    public.flowy_is_developer()
    or (
        public.flowy_current_role() = 'admin'
        and company_owner_id = public.flowy_current_company_owner_id()
    )
);

drop policy if exists flowy_user_roles_update on public.user_roles;
create policy flowy_user_roles_update
on public.user_roles
for update
using (
    public.flowy_is_developer()
    or (
        public.flowy_current_role() = 'admin'
        and company_owner_id = public.flowy_current_company_owner_id()
    )
)
with check (
    public.flowy_is_developer()
    or (
        public.flowy_current_role() = 'admin'
        and company_owner_id = public.flowy_current_company_owner_id()
    )
);

drop policy if exists flowy_user_roles_delete on public.user_roles;
create policy flowy_user_roles_delete
on public.user_roles
for delete
using (
    public.flowy_is_developer()
    or (
        public.flowy_current_role() = 'admin'
        and company_owner_id = public.flowy_current_company_owner_id()
    )
);

do $$
declare
    target_table text;
    tenant_tables text[] := array[
        'archive_files',
        'archive_folders',
        'calendar_events',
        'credentials',
        'crm_inquiries',
        'customers',
        'employees',
        'invoices',
        'offers',
        'order_confirmations',
        'project_files',
        'project_folders',
        'projects',
        'service_folders',
        'services',
        'settings',
        'time_entries',
        'timesheets',
        'vehicles'
    ];
begin
    foreach target_table in array tenant_tables loop
        if to_regclass('public.' || target_table) is not null
           and exists (
               select 1
               from information_schema.columns
               where table_schema = 'public'
                 and table_name = target_table
                 and column_name = 'userId'
           )
        then
            execute format('alter table public.%I enable row level security', target_table);

            execute format('drop policy if exists flowy_tenant_select on public.%I', target_table);
            execute format(
                'create policy flowy_tenant_select on public.%I for select using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
                target_table
            );

            execute format('drop policy if exists flowy_tenant_insert on public.%I', target_table);
            execute format(
                'create policy flowy_tenant_insert on public.%I for insert with check (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
                target_table
            );

            execute format('drop policy if exists flowy_tenant_update on public.%I', target_table);
            execute format(
                'create policy flowy_tenant_update on public.%I for update using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer()) with check (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
                target_table
            );

            execute format('drop policy if exists flowy_tenant_delete on public.%I', target_table);
            execute format(
                'create policy flowy_tenant_delete on public.%I for delete using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
                target_table
            );

            execute format(
                'create index if not exists %I on public.%I ("userId")',
                target_table || '_user_id_idx',
                target_table
            );
        end if;
    end loop;
end $$;

do $$
begin
    if to_regclass('public.todos') is not null
       and exists (
           select 1
           from information_schema.columns
           where table_schema = 'public'
             and table_name = 'todos'
             and column_name = 'userId'
       )
    then
        alter table public.todos enable row level security;

        drop policy if exists flowy_todos_select on public.todos;
        create policy flowy_todos_select
        on public.todos
        for select
        using (
            ("userId")::text = auth.uid()::text
            or ("userId")::text = public.flowy_current_company_owner_id()::text
            or public.flowy_is_developer()
        );

        drop policy if exists flowy_todos_insert on public.todos;
        create policy flowy_todos_insert
        on public.todos
        for insert
        with check (
            ("userId")::text = auth.uid()::text
            or ("userId")::text = public.flowy_current_company_owner_id()::text
            or public.flowy_is_developer()
        );

        drop policy if exists flowy_todos_update on public.todos;
        create policy flowy_todos_update
        on public.todos
        for update
        using (
            ("userId")::text = auth.uid()::text
            or ("userId")::text = public.flowy_current_company_owner_id()::text
            or public.flowy_is_developer()
        )
        with check (
            ("userId")::text = auth.uid()::text
            or ("userId")::text = public.flowy_current_company_owner_id()::text
            or public.flowy_is_developer()
        );

        drop policy if exists flowy_todos_delete on public.todos;
        create policy flowy_todos_delete
        on public.todos
        for delete
        using (
            ("userId")::text = auth.uid()::text
            or ("userId")::text = public.flowy_current_company_owner_id()::text
            or public.flowy_is_developer()
        );

        create index if not exists todos_user_id_idx on public.todos ("userId");
    end if;
end $$;

do $$
declare
    target_table text;
begin
    foreach target_table in array array[
        'archive_files',
        'archive_folders',
        'calendar_events',
        'crm_inquiry_notes',
        'crm_inquiries',
        'customers',
        'invoices',
        'offers',
        'order_confirmations',
        'project_files',
        'project_folders',
        'projects',
        'time_entries',
        'timesheets'
    ] loop
        if to_regclass('public.' || target_table) is null then
            continue;
        end if;

        if not exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'userId'
        ) then
            continue;
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'customerId'
        ) then
            execute format(
                'create index if not exists %I on public.%I ("userId", "customerId")',
                target_table || '_user_customer_idx',
                target_table
            );
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'projectId'
        ) then
            execute format(
                'create index if not exists %I on public.%I ("userId", "projectId")',
                target_table || '_user_project_idx',
                target_table
            );
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'status'
        ) then
            execute format(
                'create index if not exists %I on public.%I ("userId", status)',
                target_table || '_user_status_idx',
                target_table
            );
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'createdAt'
        ) then
            execute format(
                'create index if not exists %I on public.%I ("userId", "createdAt" desc)',
                target_table || '_user_created_at_idx',
                target_table
            );
        end if;

        if exists (
            select 1 from information_schema.columns
            where table_schema = 'public'
              and table_name = target_table
              and column_name = 'created_at'
        ) then
            execute format(
                'create index if not exists %I on public.%I ("userId", created_at desc)',
                target_table || '_user_created_at_snake_idx',
                target_table
            );
        end if;
    end loop;
end $$;

do $$
begin
    if to_regclass('public.crm_inquiry_notes') is not null
       and to_regclass('public.crm_inquiries') is not null
       and exists (
           select 1
           from information_schema.columns
           where table_schema = 'public'
             and table_name = 'crm_inquiry_notes'
             and column_name = 'inquiryId'
       )
    then
        alter table public.crm_inquiry_notes enable row level security;

        drop policy if exists flowy_crm_notes_select on public.crm_inquiry_notes;
        create policy flowy_crm_notes_select
        on public.crm_inquiry_notes
        for select
        using (
            public.flowy_is_developer()
            or exists (
                select 1
                from public.crm_inquiries i
                where i.id::text = "inquiryId"::text
                  and i."userId"::text = public.flowy_current_company_owner_id()::text
            )
        );

        drop policy if exists flowy_crm_notes_insert on public.crm_inquiry_notes;
        create policy flowy_crm_notes_insert
        on public.crm_inquiry_notes
        for insert
        with check (
            public.flowy_is_developer()
            or exists (
                select 1
                from public.crm_inquiries i
                where i.id::text = "inquiryId"::text
                  and i."userId"::text = public.flowy_current_company_owner_id()::text
            )
        );

        drop policy if exists flowy_crm_notes_update on public.crm_inquiry_notes;
        create policy flowy_crm_notes_update
        on public.crm_inquiry_notes
        for update
        using (
            public.flowy_is_developer()
            or exists (
                select 1
                from public.crm_inquiries i
                where i.id::text = "inquiryId"::text
                  and i."userId"::text = public.flowy_current_company_owner_id()::text
            )
        )
        with check (
            public.flowy_is_developer()
            or exists (
                select 1
                from public.crm_inquiries i
                where i.id::text = "inquiryId"::text
                  and i."userId"::text = public.flowy_current_company_owner_id()::text
            )
        );

        drop policy if exists flowy_crm_notes_delete on public.crm_inquiry_notes;
        create policy flowy_crm_notes_delete
        on public.crm_inquiry_notes
        for delete
        using (
            public.flowy_is_developer()
            or exists (
                select 1
                from public.crm_inquiries i
                where i.id::text = "inquiryId"::text
                  and i."userId"::text = public.flowy_current_company_owner_id()::text
            )
        );

        create index if not exists crm_inquiry_notes_inquiry_id_idx
        on public.crm_inquiry_notes ("inquiryId");
    end if;
end $$;

insert into storage.buckets (id, name, public)
values
    ('project-files', 'project-files', false),
    ('invoices', 'invoices', false),
    ('offers', 'offers', false),
    ('orders', 'orders', false),
    ('timesheets', 'timesheets', false)
on conflict (id) do update
set public = false;

update storage.buckets
set public = false
where id in ('project-files', 'invoices', 'offers', 'orders', 'timesheets');

notify pgrst, 'reload schema';
