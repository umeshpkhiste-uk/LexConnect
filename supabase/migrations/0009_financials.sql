-- Phase 3a: financial tracking (spec §16-17). A single transactions ledger
-- with a type discriminator (income/expense), not separate income/expense
-- tables — avoids duplicating the same shape twice (spec §32: prefer
-- relational modeling over ad hoc structures). "Payments" and "Expenses" in
-- the roadmap are both transactions; the type + status columns distinguish
-- them. Invoicing/payment-gateway integration is intentionally NOT built
-- here (spec §17: architecture only, no gateway in v1) — `status = pending`
-- on an income transaction is the outstanding-balance mechanism until a
-- dedicated invoices table is needed.

create type public.transaction_type as enum ('income', 'expense');
create type public.transaction_status as enum ('completed', 'pending');

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid references public.cases (id) on delete set null,
  client_id uuid references public.clients (id) on delete set null,
  type public.transaction_type not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'INR',
  status public.transaction_status not null default 'completed',
  transaction_date date not null default current_date,
  payment_method text,
  reference_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index transactions_advocate_id_idx on public.transactions (advocate_id, transaction_date);
create index transactions_case_id_idx on public.transactions (case_id);
create index transactions_client_id_idx on public.transactions (client_id);

alter table public.transactions enable row level security;

create policy "advocate can read own transactions"
  on public.transactions for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own transactions"
  on public.transactions for insert
  with check (
    (select auth.uid()) = advocate_id
    and (case_id is null or exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid())))
    and (client_id is null or exists (select 1 from public.clients where clients.id = client_id and clients.advocate_id = (select auth.uid())))
  );

create policy "advocate can update own transactions"
  on public.transactions for update
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "advocate can delete own transactions"
  on public.transactions for delete
  using ((select auth.uid()) = advocate_id);

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Per-case and per-client rollups (spec §16: "case-wise financial summary",
-- "client-wise balance"). security_invoker means the underlying table's own
-- RLS still gates every row read through these views.
create view public.case_financial_summary
  with (security_invoker = true) as
select
  case_id,
  coalesce(sum(amount) filter (where type = 'income' and status = 'completed'), 0) as total_received,
  coalesce(sum(amount) filter (where type = 'income' and status = 'pending'), 0) as total_pending,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expenses,
  coalesce(sum(amount) filter (where type = 'income' and status = 'completed'), 0)
    - coalesce(sum(amount) filter (where type = 'expense'), 0) as net_amount
from public.transactions
where case_id is not null
group by case_id;

create view public.client_financial_summary
  with (security_invoker = true) as
select
  client_id,
  coalesce(sum(amount) filter (where type = 'income' and status = 'completed'), 0) as total_received,
  coalesce(sum(amount) filter (where type = 'income' and status = 'pending'), 0) as outstanding_amount,
  coalesce(sum(amount) filter (where type = 'expense'), 0) as total_expenses
from public.transactions
where client_id is not null
group by client_id;

grant select on public.case_financial_summary to authenticated;
grant select on public.client_financial_summary to authenticated;
