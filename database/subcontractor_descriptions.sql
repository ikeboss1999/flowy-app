create table if not exists public.subcontractor_descriptions (
  id text primary key,
  "userId" uuid not null,
  "documentNumber" text not null,
  "offerId" text not null,
  "offerNumber" text,
  "projectId" text,
  "projectName" text,
  "subcontractorId" text not null,
  "subcontractorName" text,
  "subcontractorStreet" text,
  "subcontractorZip" text,
  "subcontractorCity" text,
  "customerId" text,
  "customerName" text,
  "showCustomer" boolean not null default false,
  "issueDate" timestamptz not null default now(),
  "dueDate" timestamptz,
  "constructionProject" text,
  processor text,
  "introText" text,
  items jsonb not null default '[]'::jsonb,
  notes text,
  "materialResponsibility" text,
  status text not null default 'draft',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);
create index if not exists subcontractor_descriptions_user_idx on public.subcontractor_descriptions ("userId");
create index if not exists subcontractor_descriptions_offer_idx on public.subcontractor_descriptions ("offerId");
alter table public.subcontractor_descriptions enable row level security;
alter table public.subcontractor_descriptions add column if not exists "subcontractorStreet" text;
alter table public.subcontractor_descriptions add column if not exists "subcontractorZip" text;
alter table public.subcontractor_descriptions add column if not exists "subcontractorCity" text;
alter table public.subcontractor_descriptions add column if not exists "introText" text;
