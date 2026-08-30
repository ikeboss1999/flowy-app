-- Additive schema for the developer control center. Existing tenant data is untouched.
create table if not exists public.admin_tenant_billing (
    company_owner_id uuid primary key,
    plan_name text not null default 'Standard',
    billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly', 'manual', 'free')),
    price_amount numeric(12,2) not null default 0,
    currency text not null default 'EUR',
    payment_status text not null default 'unknown' check (payment_status in ('unknown', 'trial', 'paid', 'open', 'overdue', 'failed', 'cancelled', 'free')),
    trial_ends_at timestamptz,
    last_payment_at timestamptz,
    next_payment_at timestamptz,
    cancelled_at timestamptz,
    internal_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.admin_tenant_access (
    company_owner_id uuid primary key,
    is_suspended boolean not null default false,
    suspension_reason text,
    suspended_at timestamptz,
    suspended_by uuid,
    force_logout_after timestamptz,
    updated_at timestamptz not null default now()
);
alter table public.admin_tenant_access add column if not exists force_logout_after timestamptz;

create table if not exists public.admin_user_sessions (
    id uuid primary key,
    user_id uuid not null,
    company_owner_id uuid not null,
    app_source text not null default 'web',
    user_agent text,
    ip_hash text,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    revoked_at timestamptz
);

create index if not exists admin_user_sessions_last_seen_idx on public.admin_user_sessions(last_seen_at desc);
create index if not exists admin_user_sessions_owner_idx on public.admin_user_sessions(company_owner_id);

create table if not exists public.admin_audit_logs (
    id bigint generated always as identity primary key,
    developer_user_id uuid not null,
    action text not null,
    target_type text not null,
    target_id text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.admin_tenant_usage_snapshots (
    company_owner_id uuid primary key,
    counts jsonb not null default '{}'::jsonb,
    storage_bytes bigint not null default 0,
    storage_files integer not null default 0,
    calculated_at timestamptz not null default now(),
    calculation_ms integer not null default 0,
    last_error text
);

create table if not exists public.admin_system_jobs (
    job_name text primary key,
    status text not null check (status in ('running', 'success', 'failed')),
    started_at timestamptz not null,
    completed_at timestamptz,
    result jsonb not null default '{}'::jsonb,
    last_error text
);

create index if not exists admin_audit_logs_created_idx on public.admin_audit_logs(created_at desc);

alter table public.admin_tenant_billing enable row level security;
alter table public.admin_tenant_access enable row level security;
alter table public.admin_user_sessions enable row level security;
alter table public.admin_audit_logs enable row level security;
alter table public.admin_tenant_usage_snapshots enable row level security;
alter table public.admin_system_jobs enable row level security;
revoke all on public.admin_tenant_billing from anon, authenticated;
revoke all on public.admin_tenant_access from anon, authenticated;
revoke all on public.admin_user_sessions from anon, authenticated;
revoke all on public.admin_audit_logs from anon, authenticated;
revoke all on public.admin_tenant_usage_snapshots from anon, authenticated;
revoke all on public.admin_system_jobs from anon, authenticated;
