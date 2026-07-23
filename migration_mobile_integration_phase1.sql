-- FlowY Mobile Integration Phase 1: secure access foundations and assignment models.
-- Run this in the Supabase SQL editor after reviewing the existing production schema.
-- This migration is defensive and does not modify existing employee, project, or time-entry data.

create extension if not exists pgcrypto;

create table if not exists public.mobile_activation_codes (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "employeeId" text not null,
    "codeHash" text not null,
    status text not null default 'active' check (status in ('active', 'consumed', 'revoked', 'expired')),
    "expiresAt" timestamptz not null,
    "consumedAt" timestamptz,
    "revokedAt" timestamptz,
    attempts integer not null default 0,
    "createdBy" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists mobile_activation_codes_user_employee_idx
on public.mobile_activation_codes ("userId", "employeeId");

create unique index if not exists mobile_activation_codes_one_active_per_employee_idx
on public.mobile_activation_codes ("userId", "employeeId")
where status = 'active';

create table if not exists public.employee_mobile_sessions (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "employeeId" text not null,
    "refreshTokenHash" text not null,
    platform text,
    "deviceName" text,
    "appVersion" text,
    "lastSeenAt" timestamptz,
    "expiresAt" timestamptz not null,
    "revokedAt" timestamptz,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists employee_mobile_sessions_user_employee_idx
on public.employee_mobile_sessions ("userId", "employeeId");

create index if not exists employee_mobile_sessions_active_idx
on public.employee_mobile_sessions ("userId", "employeeId", "expiresAt")
where "revokedAt" is null;

create table if not exists public.project_assignments (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "projectId" text not null,
    "employeeId" text not null,
    task text,
    "startDate" date,
    "endDate" date,
    status text not null default 'active' check (status in ('active', 'inactive')),
    "createdBy" text,
    "updatedBy" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists project_assignments_user_employee_idx
on public.project_assignments ("userId", "employeeId", status);

create index if not exists project_assignments_user_project_idx
on public.project_assignments ("userId", "projectId", status);

create unique index if not exists project_assignments_unique_active_idx
on public.project_assignments ("userId", "projectId", "employeeId")
where status = 'active';

create table if not exists public.project_diary_entries (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "projectId" text not null,
    "employeeId" text,
    "createdByUserId" text,
    source text not null check (source in ('mobile', 'web')),
    description text not null,
    visibility text not null default 'office' check (visibility in ('office', 'assigned_team')),
    status text not null default 'published' check (status in ('published', 'corrected', 'deleted')),
    "clientOperationId" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists project_diary_entries_user_project_idx
on public.project_diary_entries ("userId", "projectId", status, "createdAt" desc);

create unique index if not exists project_diary_entries_client_operation_idx
on public.project_diary_entries ("userId", "employeeId", "clientOperationId")
where "clientOperationId" is not null;

create table if not exists public.project_diary_attachments (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "diaryEntryId" uuid not null references public.project_diary_entries(id) on delete cascade,
    "storagePath" text not null,
    "mimeType" text not null,
    "fileSize" integer not null,
    "createdAt" timestamptz not null default now()
);

create index if not exists project_diary_attachments_user_entry_idx
on public.project_diary_attachments ("userId", "diaryEntryId");

create table if not exists public.employee_document_folders (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "employeeId" text not null,
    name text not null,
    "sortOrder" integer not null default 0,
    "createdBy" text,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create unique index if not exists employee_document_folders_unique_name_idx
on public.employee_document_folders ("userId", "employeeId", lower(trim(name)));

create table if not exists public.employee_documents (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "employeeId" text not null,
    "folderId" uuid references public.employee_document_folders(id) on delete set null,
    name text not null,
    "mimeType" text not null,
    "fileSize" integer not null,
    "storagePath" text not null,
    "uploadedBy" text,
    "isShared" boolean not null default false,
    "readRequired" boolean not null default false,
    "createdAt" timestamptz not null default now(),
    "updatedAt" timestamptz not null default now()
);

create index if not exists employee_documents_user_employee_idx
on public.employee_documents ("userId", "employeeId", "isShared");

create unique index if not exists employee_documents_storage_path_idx
on public.employee_documents ("storagePath");

create table if not exists public.document_receipts (
    id uuid primary key default gen_random_uuid(),
    "userId" text not null,
    "documentId" uuid not null references public.employee_documents(id) on delete cascade,
    "employeeId" text not null,
    "readAt" timestamptz not null default now(),
    unique ("documentId", "employeeId")
);

create index if not exists document_receipts_user_employee_idx
on public.document_receipts ("userId", "employeeId");

do $$
declare
    target_table text;
    mobile_tables text[] := array[
        'mobile_activation_codes',
        'employee_mobile_sessions',
        'project_assignments',
        'project_diary_entries',
        'project_diary_attachments',
        'employee_document_folders',
        'employee_documents',
        'document_receipts'
    ];
begin
    foreach target_table in array mobile_tables loop
        execute format('alter table public.%I enable row level security', target_table);

        execute format('drop policy if exists flowy_mobile_tenant_select on public.%I', target_table);
        execute format(
            'create policy flowy_mobile_tenant_select on public.%I for select using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
            target_table
        );

        execute format('drop policy if exists flowy_mobile_tenant_insert on public.%I', target_table);
        execute format(
            'create policy flowy_mobile_tenant_insert on public.%I for insert with check (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
            target_table
        );

        execute format('drop policy if exists flowy_mobile_tenant_update on public.%I', target_table);
        execute format(
            'create policy flowy_mobile_tenant_update on public.%I for update using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer()) with check (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
            target_table
        );

        execute format('drop policy if exists flowy_mobile_tenant_delete on public.%I', target_table);
        execute format(
            'create policy flowy_mobile_tenant_delete on public.%I for delete using (("userId")::text = public.flowy_current_company_owner_id()::text or public.flowy_is_developer())',
            target_table
        );
    end loop;
end $$;

insert into storage.buckets (id, name, public)
values
    ('employee-mobile-documents', 'employee-mobile-documents', false),
    ('employee-avatars', 'employee-avatars', false),
    ('project-diary-attachments', 'project-diary-attachments', false)
on conflict (id) do update
set public = false;

update storage.buckets
set public = false
where id in ('employee-mobile-documents', 'employee-avatars', 'project-diary-attachments');

notify pgrst, 'reload schema';
