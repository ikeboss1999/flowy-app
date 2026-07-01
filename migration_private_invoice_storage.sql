-- Make document PDFs private.
-- Run this in the Supabase SQL editor after deploying the server-side signed URL flow.

alter table if exists public.invoices
add column if not exists "pdfUrl" text;

alter table if exists public.offers
add column if not exists "pdfUrl" text;

alter table if exists public.order_confirmations
add column if not exists "pdfUrl" text;

alter table if exists public.timesheets
add column if not exists "pdfUrl" text;

insert into storage.buckets (id, name, public)
values
    ('invoices', 'invoices', false),
    ('offers', 'offers', false),
    ('orders', 'orders', false),
    ('timesheets', 'timesheets', false)
on conflict (id) do update
set public = false;

update storage.buckets
set public = false
where id in ('invoices', 'offers', 'orders', 'timesheets');

notify pgrst, 'reload schema';
