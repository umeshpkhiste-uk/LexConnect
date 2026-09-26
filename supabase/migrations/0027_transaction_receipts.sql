-- Optional receipt / payment screenshot on a transaction. Stored in the
-- private `documents` bucket under the advocate's own folder (0010 policies)
-- and shown through signed URLs.
alter table public.transactions add column receipt_path text;

alter table public.transactions
  add constraint transactions_receipt_in_own_folder check (
    receipt_path is null or split_part(receipt_path, '/', 1) = advocate_id::text
  );
