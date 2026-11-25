-- Prüfentscheidungen bei Eingangsrechnungen dauerhaft und nachvollziehbar speichern.
-- Einmal im Supabase SQL Editor ausführen.
alter table public.incoming_invoices
    add column if not exists "decisionReason" text,
    add column if not exists "decisionAt" timestamptz,
    add column if not exists "decisionBy" uuid;

create index if not exists incoming_invoices_user_decision_idx
    on public.incoming_invoices ("userId", "decisionAt" desc)
    where "decisionAt" is not null;
