-- Partial payment support: an advocate may receive less than the full
-- pending amount at once. Recording ₹X against a ₹Y pending transaction
-- (X < Y) must, atomically:
--   1. record a new completed transaction for the ₹X actually received
--   2. reduce the original pending transaction to ₹(Y - X)
-- Doing this as two separate client-side writes risks leaving the ledger
-- inconsistent if the second write fails (e.g. connectivity drop between
-- calls) — a single function call is one transaction, so it's all-or-nothing.
--
-- SECURITY INVOKER (the default): every statement inside still runs under
-- the caller's own RLS policies, so this grants no privilege the caller
-- didn't already have — it only makes an otherwise two-step, non-atomic
-- operation into one.

create or replace function public.record_partial_payment(p_transaction_id uuid, p_amount_received numeric)
returns public.transactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_transaction public.transactions;
  v_remaining numeric;
begin
  select * into v_transaction from public.transactions where id = p_transaction_id for update;

  if v_transaction is null then
    raise exception 'Transaction not found';
  end if;

  if v_transaction.type <> 'income' or v_transaction.status <> 'pending' then
    raise exception 'Only a pending income transaction can be marked as received';
  end if;

  if p_amount_received is null or p_amount_received <= 0 or p_amount_received > v_transaction.amount then
    raise exception 'Amount received must be greater than 0 and no more than the pending amount';
  end if;

  v_remaining := v_transaction.amount - p_amount_received;

  if v_remaining = 0 then
    update public.transactions set status = 'completed' where id = p_transaction_id;
  else
    update public.transactions set amount = v_remaining where id = p_transaction_id;

    insert into public.transactions (
      advocate_id, case_id, client_id, type, category, amount, currency, status,
      transaction_date, payment_method, reference_number, notes
    ) values (
      v_transaction.advocate_id, v_transaction.case_id, v_transaction.client_id, v_transaction.type,
      v_transaction.category, p_amount_received, v_transaction.currency, 'completed',
      current_date, v_transaction.payment_method, v_transaction.reference_number, v_transaction.notes
    );
  end if;

  select * into v_transaction from public.transactions where id = p_transaction_id;
  return v_transaction;
end;
$$;

revoke execute on function public.record_partial_payment(uuid, numeric) from public, anon;
grant execute on function public.record_partial_payment(uuid, numeric) to authenticated;
