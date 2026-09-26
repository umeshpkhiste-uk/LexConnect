-- Optional client photo. Client data is private, so the image lives in the
-- private `documents` bucket under the advocate's own folder (whose storage
-- policies from 0010 already restrict access to that advocate) and is shown
-- through short-lived signed URLs.
alter table public.clients add column photo_path text;

alter table public.clients
  add constraint clients_photo_in_own_folder check (
    photo_path is null or split_part(photo_path, '/', 1) = advocate_id::text
  );
