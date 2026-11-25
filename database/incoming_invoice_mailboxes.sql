-- IMAP-Konfiguration serverseitig speichern; keine direkten Browserzugriffe.
create table if not exists public.incoming_invoice_mailboxes (
  "userId" uuid primary key,
  host text not null,
  port integer not null check (port between 1 and 65535),
  username text not null,
  "passwordEncrypted" text not null,
  mailbox text not null default 'INBOX',
  enabled boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
alter table public.incoming_invoice_mailboxes enable row level security;

-- Abrufposition und Sperre verhindern parallele Verarbeitung desselben Postfachs.
alter table public.incoming_invoice_mailboxes
  add column if not exists "uidValidity" text,
  add column if not exists "lastUid" bigint,
  add column if not exists "lockedUntil" timestamptz,
  add column if not exists "lastCheckedAt" timestamptz,
  add column if not exists "lastError" text;

create table if not exists public.incoming_invoice_mail_parts (
  id text primary key,
  "userId" uuid not null,
  "importId" text not null,
  "createdAt" timestamptz not null default now()
);
alter table public.incoming_invoice_mail_parts enable row level security;
