-- 1) Notification privacy: a chat notification's body used to embed the
-- first 140 characters of the actual message (or "Photo"/the attached
-- file's name). Anyone with database access — including via the push
-- notification payload — could read it. It now only ever says what kind of
-- thing arrived, never the content.
create or replace function public.trg_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_sender_name text;
  v_body text;
begin
  select case when c.participant_one_id = new.sender_id then c.participant_two_id else c.participant_one_id end
    into v_recipient
  from public.conversations c where c.id = new.conversation_id;

  select full_name into v_sender_name from public.advocate_profiles where id = new.sender_id;

  v_body := case
    when new.attachment_kind = 'image' then 'Sent you a photo'
    when new.attachment_kind = 'file' then 'Sent you a file'
    else 'Sent you a message'
  end;

  perform public.notify(v_recipient, 'new_message', coalesce(v_sender_name, 'Someone') || ' sent you a message',
    v_body, jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end;
$$;

revoke execute on function public.trg_notify_new_message() from public, anon, authenticated;

-- 2) End-to-end message encryption. Each advocate holds a Curve25519
-- key pair (tweetnacl box); only the public half is ever stored here — the
-- secret key lives solely on the advocate's device (expo-secure-store) and
-- is never uploaded. From the moment the client starts encrypting, message
-- `content` is ciphertext: nobody with database access, including Supabase
-- itself, can read it — only the two devices holding the matching secret
-- keys can, via Diffie-Hellman with the sender's/recipient's public key.
alter table public.advocate_profiles add column messaging_public_key text;

create or replace view public.public_advocate_profiles
with (security_invoker = false) as
select
  id,
  full_name,
  headline,
  about,
  city,
  state,
  languages,
  practice_areas,
  courts,
  years_of_experience,
  website,
  profile_photo_url,
  verification_status = 'verified'::verification_status as is_verified,
  case when contact_info_visible then contact_preferences else '{}'::jsonb end as contact_preferences,
  created_at,
  education,
  bar_memberships,
  messaging_public_key
from public.advocate_profiles p
where p.profile_visibility = any (array['public'::profile_visibility, 'connections_only'::profile_visibility])
   or p.id = (select auth.uid())
   or exists (
     select 1 from public.connections c
     where c.status = 'accepted'
       and least(c.requester_id, c.addressee_id) = least(p.id, (select auth.uid()))
       and greatest(c.requester_id, c.addressee_id) = greatest(p.id, (select auth.uid()))
   );

-- A per-message random nonce alongside the ciphertext. Null means a legacy
-- plaintext message sent before encryption existed — the app renders those
-- as-is rather than trying (and failing) to decrypt them.
alter table public.messages add column nonce text;

-- Base64 ciphertext runs longer than the plaintext it replaces (box
-- overhead + base64 expansion), so the length cap widens to match.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check check (
    char_length(content) <= 6000
    and (char_length(content) >= 1 or attachment_path is not null)
  );
