-- Enables customer-specific folders and files using the existing archive metadata tables.
-- Run once in Supabase SQL Editor before using customer file uploads.

alter table public.archive_files
add column if not exists "customerId" text;

alter table public.archive_folders
add column if not exists "customerId" text;

create index if not exists archive_files_customer_id_idx
on public.archive_files ("userId", "customerId");

create index if not exists archive_folders_customer_id_idx
on public.archive_folders ("userId", "customerId");
