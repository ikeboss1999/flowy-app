-- FlowY Eingangsrechnungen – additive Grundlage
-- Einmal im Supabase SQL Editor ausführen.
-- Bestehende Ausgangsrechnungen, Kontakte und Dokumente werden nicht verändert.

begin;

create table if not exists public.suppliers (
  id text primary key,
  "userId" uuid not null,
  "supplierNumber" text not null,
  name text not null,
  "contactPerson" text,
  email text,
  phone text,
  street text,
  zip text,
  city text,
  country text,
  "vatNumber" text,
  "commercialRegisterNumber" text,
  "bankName" text,
  iban text,
  bic text,
  "paymentTermId" text,
  "defaultCategory" text,
  notes text,
  status text not null default 'active' check (status in ('active', 'inactive', 'blocked')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create unique index if not exists suppliers_user_number_idx
  on public.suppliers ("userId", "supplierNumber");
create index if not exists suppliers_user_name_idx
  on public.suppliers ("userId", name);
create index if not exists suppliers_user_vat_idx
  on public.suppliers ("userId", "vatNumber")
  where "vatNumber" is not null;

create table if not exists public.incoming_invoice_imports (
  id text primary key,
  "userId" uuid not null,
  "sourceType" text not null check ("sourceType" in ('manual_upload', 'imap')),
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'completed', 'failed')),
  "originalFilePath" text not null,
  "originalFileName" text not null,
  "originalMimeType" text,
  "originalFileSize" bigint,
  "fileHash" text,
  "pageCount" integer check ("pageCount" is null or "pageCount" > 0),
  "detectedDocumentCount" integer not null default 0 check ("detectedDocumentCount" >= 0),
  "emailMessageId" text,
  "emailUid" text,
  mailbox text,
  "receivedAt" timestamptz,
  "errorMessage" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists incoming_invoice_imports_user_created_idx
  on public.incoming_invoice_imports ("userId", "createdAt" desc);
create index if not exists incoming_invoice_imports_user_hash_idx
  on public.incoming_invoice_imports ("userId", "fileHash")
  where "fileHash" is not null;
create unique index if not exists incoming_invoice_imports_imap_message_idx
  on public.incoming_invoice_imports ("userId", "emailMessageId")
  where "emailMessageId" is not null;

create table if not exists public.incoming_invoices (
  id text primary key,
  "userId" uuid not null,
  "importId" text references public.incoming_invoice_imports(id) on delete restrict,
  "supplierId" text references public.suppliers(id) on delete set null,
  "sourceType" text not null default 'manual_upload' check ("sourceType" in ('manual_upload', 'imap')),
  status text not null default 'new' check (status in ('new', 'extracting', 'review', 'approved', 'paid', 'overdue', 'duplicate', 'rejected', 'failed')),
  "originalFilePath" text not null,
  "originalFileName" text not null,
  "pageFrom" integer check ("pageFrom" is null or "pageFrom" > 0),
  "pageTo" integer check ("pageTo" is null or "pageTo" > 0),
  "supplierName" text,
  "supplierVatNumber" text,
  "supplierAddress" jsonb not null default '{}'::jsonb,
  "invoiceNumber" text,
  "issueDate" date,
  "servicePeriodFrom" date,
  "servicePeriodTo" date,
  currency text not null default 'EUR' check (char_length(currency) = 3),
  "netAmount" numeric(14, 2) check ("netAmount" is null or "netAmount" >= 0),
  "taxAmount" numeric(14, 2) check ("taxAmount" is null or "taxAmount" >= 0),
  "grossAmount" numeric(14, 2) check ("grossAmount" is null or "grossAmount" >= 0),
  "taxBreakdown" jsonb not null default '[]'::jsonb,
  "dueDate" date,
  "paymentTerms" text,
  "discountPercent" numeric(5, 2) check ("discountPercent" is null or ("discountPercent" >= 0 and "discountPercent" <= 100)),
  "discountDueDate" date,
  "discountAmount" numeric(14, 2) check ("discountAmount" is null or "discountAmount" >= 0),
  "discountedGrossAmount" numeric(14, 2) check ("discountedGrossAmount" is null or "discountedGrossAmount" >= 0),
  iban text,
  bic text,
  "paymentReference" text,
  category text,
  "projectId" text,
  "projectName" text,
  notes text,
  "extractedData" jsonb not null default '{}'::jsonb,
  "extractionConfidence" numeric(4, 3) check ("extractionConfidence" is null or ("extractionConfidence" >= 0 and "extractionConfidence" <= 1)),
  "reviewRequired" boolean not null default true,
  "isDuplicate" boolean not null default false,
  "isFlagged" boolean not null default false,
  "duplicateOfInvoiceId" text references public.incoming_invoices(id) on delete set null,
  "duplicateScore" numeric(4, 3) check ("duplicateScore" is null or ("duplicateScore" >= 0 and "duplicateScore" <= 1)),
  "duplicateReasons" jsonb not null default '[]'::jsonb,
  "approvedAt" timestamptz,
  "approvedBy" uuid,
  "paidAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  check ("pageTo" is null or "pageFrom" is null or "pageTo" >= "pageFrom")
);

create index if not exists incoming_invoices_user_status_due_idx
  on public.incoming_invoices ("userId", status, "dueDate");
create index if not exists incoming_invoices_user_supplier_idx
  on public.incoming_invoices ("userId", "supplierId");
create index if not exists incoming_invoices_user_number_idx
  on public.incoming_invoices ("userId", "invoiceNumber");
create index if not exists incoming_invoices_user_issue_date_idx
  on public.incoming_invoices ("userId", "issueDate" desc);
create index if not exists incoming_invoices_import_idx
  on public.incoming_invoices ("importId");

create table if not exists public.incoming_invoice_items (
  id text primary key,
  "userId" uuid not null,
  "invoiceId" text not null references public.incoming_invoices(id) on delete cascade,
  "positionNumber" integer not null check ("positionNumber" > 0),
  description text not null,
  quantity numeric(14, 3),
  unit text,
  "unitPriceNet" numeric(14, 2),
  "netAmount" numeric(14, 2),
  "taxRate" numeric(5, 2),
  "taxAmount" numeric(14, 2),
  "grossAmount" numeric(14, 2),
  "rawData" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  created_by uuid,
  updated_by uuid
);

create index if not exists incoming_invoice_items_invoice_position_idx
  on public.incoming_invoice_items ("invoiceId", "positionNumber");
create index if not exists incoming_invoice_items_user_description_idx
  on public.incoming_invoice_items ("userId", description);

create table if not exists public.incoming_invoice_audit_log (
  id text primary key,
  "userId" uuid not null,
  "invoiceId" text not null references public.incoming_invoices(id) on delete cascade,
  "eventType" text not null,
  "actorUserId" uuid,
  details jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);

create index if not exists incoming_invoice_audit_invoice_created_idx
  on public.incoming_invoice_audit_log ("invoiceId", "createdAt" desc);
create index if not exists incoming_invoice_audit_user_created_idx
  on public.incoming_invoice_audit_log ("userId", "createdAt" desc);

-- RLS is deliberately enabled without browser policies. Future API routes will use the
-- authenticated server client, so uploaded financial documents never become public.
alter table public.suppliers enable row level security;
alter table public.incoming_invoice_imports enable row level security;
alter table public.incoming_invoices enable row level security;
alter table public.incoming_invoice_items enable row level security;
alter table public.incoming_invoice_audit_log enable row level security;

-- Private only. Files will be stored below <tenant-id>/... and accessed via server routes.
insert into storage.buckets (id, name, public)
values ('incoming-invoices', 'incoming-invoices', false)
on conflict (id) do update set public = false;

commit;
