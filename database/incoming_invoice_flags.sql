-- FlowY Eingangsrechnungen: Merkliste / Wiedervorlage
-- Einmal im Supabase SQL Editor ausführen.

alter table public.incoming_invoices
  add column if not exists "isFlagged" boolean not null default false;

create index if not exists incoming_invoices_user_flagged_idx
  on public.incoming_invoices ("userId", "isFlagged")
  where "isFlagged" = true;
