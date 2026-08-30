-- Run once in the Supabase SQL editor before deploying the account-backup code.
create table if not exists public.account_backups (
    id uuid primary key,
    company_owner_id uuid not null,
    owner_email text,
    status text not null check (status in ('creating', 'ready', 'restore_pending', 'restored', 'expired', 'failed')),
    storage_path text not null,
    table_counts jsonb not null default '{}'::jsonb,
    file_count integer not null default 0,
    total_bytes bigint not null default 0,
    created_at timestamptz not null default now(),
    expires_at timestamptz not null,
    completed_at timestamptz,
    restored_at timestamptz,
    failure_reason text
);

alter table public.account_backups enable row level security;
revoke all on public.account_backups from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('user-backups', 'user-backups', false, null)
on conflict (id) do update set public = false;

-- Only the service-role backend may access this bucket. No client storage policy is created.
create index if not exists account_backups_expires_at_idx
    on public.account_backups (expires_at)
    where status = 'ready';
