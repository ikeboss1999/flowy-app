-- FlowY offer options: discount terms and optional order acceptance form.
-- Run once in Supabase SQL editor before using the new offer options.

alter table if exists public.offers
add column if not exists "discountEnabled" boolean default false;

alter table if exists public.offers
add column if not exists "discountDays" numeric;

alter table if exists public.offers
add column if not exists "discountPercent" numeric;

alter table if exists public.offers
add column if not exists "orderAcceptanceFormEnabled" boolean default false;

notify pgrst, 'reload schema';
