-- Recording a payment against a pending fee can now also set how it was
-- paid and attach the receipt / screenshot. On a part payment these go on
-- the new "received" entry; on a full payment, on the entry itself.
drop function if exists public.record_partial_payment(uuid, numeric);

create or replace function public.record_partial_payment(
  p_transaction_id uuid,
  p_amount_received numeric,
  p_payment_method text default null,
  p_receipt_path text default null
)
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
    update public.transactions
       set status = 'completed',
           transaction_date = current_date,
           payment_method = coalesce(nullif(trim(p_payment_method), ''), payment_method),
           receipt_path = coalesce(p_receipt_path, receipt_path)
     where id = p_transaction_id;
  else
    update public.transactions set amount = v_remaining where id = p_transaction_id;

    insert into public.transactions (
      advocate_id, case_id, client_id, type, category, amount, currency, status,
      transaction_date, payment_method, reference_number, notes, receipt_path
    ) values (
      v_transaction.advocate_id, v_transaction.case_id, v_transaction.client_id, v_transaction.type,
      v_transaction.category, p_amount_received, v_transaction.currency, 'completed',
      current_date, coalesce(nullif(trim(p_payment_method), ''), v_transaction.payment_method),
      v_transaction.reference_number, v_transaction.notes, p_receipt_path
    );
  end if;

  select * into v_transaction from public.transactions where id = p_transaction_id;
  return v_transaction;
end;
$$;

revoke execute on function public.record_partial_payment(uuid, numeric, text, text) from public, anon;
grant execute on function public.record_partial_payment(uuid, numeric, text, text) to authenticated;
