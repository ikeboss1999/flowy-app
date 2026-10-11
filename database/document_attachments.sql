-- Ein Anhang je Angebot bzw. Rechnung. Die Datei liegt privat im bestehenden
-- Storage-Bucket "offers" bzw. "invoices"; die Metadaten bleiben am Dokument.
alter table public.invoices
  add column if not exists "attachmentName" text,
  add column if not exists "attachmentPath" text,
  add column if not exists "attachmentMimeType" text,
  add column if not exists "attachmentSize" bigint;

alter table public.offers
  add column if not exists "attachmentName" text,
  add column if not exists "attachmentPath" text,
  add column if not exists "attachmentMimeType" text,
  add column if not exists "attachmentSize" bigint;
