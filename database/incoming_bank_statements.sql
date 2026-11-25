-- Additive Tabellen für den Abgleich von Eingangsrechnungen mit Kontoauszügen.
begin;
create table if not exists public.incoming_bank_statements (
  id text primary key, "userId" uuid not null, "originalFilePath" text not null,
  "originalFileName" text not null, "fileHash" text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'review', 'failed')),
  "errorMessage" text, "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(), created_by uuid, updated_by uuid
);
create unique index if not exists incoming_bank_statements_user_hash_idx on public.incoming_bank_statements ("userId", "fileHash");
create table if not exists public.incoming_bank_transactions (
  id text primary key, "userId" uuid not null,
  "statementId" text not null references public.incoming_bank_statements(id) on delete restrict,
  "bookingDate" date, description text not null default '', counterparty text,
  iban text, reference text, amount numeric(14,2) not null, currency text not null default 'EUR',
  "matchedInvoiceId" text references public.incoming_invoices(id) on delete restrict,
  "matchedAt" timestamptz, "matchedBy" uuid,
  "createdAt" timestamptz not null default now()
);
create unique index if not exists incoming_bank_transactions_invoice_unique on public.incoming_bank_transactions ("userId", "matchedInvoiceId") where "matchedInvoiceId" is not null;
create index if not exists incoming_bank_transactions_user_statement_idx on public.incoming_bank_transactions ("userId", "statementId");
alter table public.incoming_bank_statements enable row level security;
alter table public.incoming_bank_transactions enable row level security;
insert into storage.buckets (id, name, public) values ('incoming-bank-statements', 'incoming-bank-statements', false) on conflict (id) do update set public = false;

create or replace function public.confirm_incoming_bank_payment(p_user_id uuid, p_transaction_id text, p_invoice_id text, p_actor_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare tx public.incoming_bank_transactions%rowtype; inv public.incoming_invoices%rowtype;
begin
  select * into tx from public.incoming_bank_transactions where id = p_transaction_id and "userId" = p_user_id for update;
  if not found then raise exception 'Buchung nicht gefunden'; end if;
  select * into inv from public.incoming_invoices where id = p_invoice_id and "userId" = p_user_id for update;
  if not found then raise exception 'Rechnung nicht gefunden'; end if;
  if tx."matchedInvoiceId" is not null then raise exception 'Buchung ist bereits zugeordnet'; end if;
  if inv.status <> 'approved' then raise exception 'Nur freigegebene Rechnungen können zugeordnet werden'; end if;
  if tx.amount >= 0 or tx.currency <> inv.currency or inv."grossAmount" is null then raise exception 'Betrag oder Währung passt nicht'; end if;
  if abs(abs(tx.amount) - inv."grossAmount") > 0.01 and not (inv."discountedGrossAmount" is not null and inv."discountDueDate" is not null and tx."bookingDate" <= inv."discountDueDate" and abs(abs(tx.amount) - inv."discountedGrossAmount") <= 0.01) then
    raise exception 'Der Zahlbetrag entspricht weder dem Rechnungsbetrag noch einem gültigen Skontobetrag';
  end if;
  update public.incoming_bank_transactions set "matchedInvoiceId" = inv.id, "matchedAt" = now(), "matchedBy" = p_actor_id where id = tx.id and "userId" = p_user_id;
  update public.incoming_invoices set status = 'paid', "paidAt" = now(), "updatedAt" = now(), updated_by = p_actor_id where id = inv.id and "userId" = p_user_id;
  insert into public.incoming_invoice_audit_log (id, "userId", "invoiceId", "eventType", "actorUserId", details)
    values (md5(random()::text || clock_timestamp()::text), p_user_id, inv.id, 'bank_payment_confirmed', p_actor_id, jsonb_build_object('transactionId', tx.id, 'amount', tx.amount, 'bookingDate', tx."bookingDate"));
end $$;
revoke all on function public.confirm_incoming_bank_payment(uuid,text,text,uuid) from public, anon, authenticated;
grant execute on function public.confirm_incoming_bank_payment(uuid,text,text,uuid) to service_role;
commit;
