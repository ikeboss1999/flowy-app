create table if not exists public.subcontractors (
  id text primary key,
  "userId" uuid not null,
  name text not null,
  "contactPerson" text,
  email text,
  phone text,
  street text,
  zip text,
  city text,
  "taxId" text,
  "commercialRegisterNumber" text,
  "bankName" text,
  iban text,
  bic text,
  "paymentTermId" text,
  "workAreas" jsonb not null default '[]'::jsonb,
  "beitragskontonummer" text,
  "hfuListed" boolean not null default false,
  notes text,
  status text not null default 'active',
  subcontractor_number text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index if not exists subcontractors_user_id_idx on public.subcontractors ("userId");
create unique index if not exists subcontractors_user_number_idx on public.subcontractors ("userId", subcontractor_number) where subcontractor_number is not null;
alter table public.subcontractors enable row level security;
alter table public.subcontractors add column if not exists "bankName" text;
alter table public.subcontractors add column if not exists iban text;
alter table public.subcontractors add column if not exists bic text;
alter table public.subcontractors add column if not exists "paymentTermId" text;
alter table public.subcontractors add column if not exists "workAreas" jsonb not null default '[]'::jsonb;
alter table public.subcontractors add column if not exists "beitragskontonummer" text;
alter table public.subcontractors add column if not exists "hfuListed" boolean not null default false;
