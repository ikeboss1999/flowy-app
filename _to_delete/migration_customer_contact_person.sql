-- Adds an optional contact person field for business customers.
-- Run this once in Supabase SQL Editor before using the new field in production.

alter table public.customers
add column if not exists "contactPerson" text;
