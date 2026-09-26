-- WhatsApp-style chat: replies, edits, photo/file attachments, and live
-- delivery over Realtime. Messaging stays connection-gated (0017).

alter table public.messages
  add column reply_to_id uuid references public.messages (id) on delete set null,
  add column edited_at timestamptz,
  add column attachment_path text,
  add column attachment_kind text check (attachment_kind in ('image', 'file')),
  add column attachment_name text,
  add column attachment_size integer,
  add column attachment_mime text;

-- A photo or file can be sent without a caption, so content may be empty
-- when there is an attachment.
alter table public.messages drop constraint if exists messages_content_check;
alter table public.messages
  add constraint messages_content_check check (
    char_length(content) <= 2000
    and (char_length(content) >= 1 or attachment_path is not null)
  );

alter table public.messages
  add constraint messages_attachment_consistent check (
    (attachment_path is null and attachment_kind is null)
    or (attachment_path is not null and attachment_kind is not null)
  );

-- An attachment must live in its own conversation's folder, so one chat can
-- never point at another chat's files.
alter table public.messages
  add constraint messages_attachment_in_conversation check (
    attachment_path is null or split_part(attachment_path, '/', 1) = conversation_id::text
  );

-- A reply must quote a message from the same conversation.
create or replace function public.check_message_reply()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.reply_to_id is not null and not exists (
    select 1 from public.messages m where m.id = new.reply_to_id and m.conversation_id = new.conversation_id
  ) then
    raise exception 'Reply must reference a message in the same conversation';
  end if;
  return new;
end;
$$;

create trigger messages_check_reply
  before insert on public.messages
  for each row execute function public.check_message_reply();

-- Only the sender may change anything but read_at.
create or replace function public.protect_message_ownership()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.sender_id <> old.sender_id or new.conversation_id <> old.conversation_id then
    raise exception 'Cannot reassign a message to a different sender or conversation';
  end if;
  if (select auth.uid()) <> old.sender_id and (
    new.content is distinct from old.content
    or new.is_deleted is distinct from old.is_deleted
    or new.edited_at is distinct from old.edited_at
    or new.reply_to_id is distinct from old.reply_to_id
    or new.attachment_path is distinct from old.attachment_path
    or new.attachment_kind is distinct from old.attachment_kind
    or new.attachment_name is distinct from old.attachment_name
    or new.attachment_size is distinct from old.attachment_size
    or new.attachment_mime is distinct from old.attachment_mime
  ) then
    raise exception 'Only the sender can edit or delete a message';
  end if;
  if old.is_deleted and not new.is_deleted then
    raise exception 'A deleted message cannot be restored';
  end if;
  return new;
end;
$$;

-- Notification text for photo/file messages, which may have no caption.
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
    when char_length(new.content) > 0 then left(new.content, 140)
    when new.attachment_kind = 'image' then 'Photo'
    else 'File: ' || coalesce(new.attachment_name, 'attachment')
  end;

  perform public.notify(v_recipient, 'new_message', coalesce(v_sender_name, 'Someone') || ' sent you a message',
    v_body, jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end;
$$;

revoke execute on function public.trg_notify_new_message() from public, anon, authenticated;

-- Live delivery: participants receive inserts/updates (RLS still applies).
alter publication supabase_realtime add table public.messages;

-- Private bucket; path is `${conversation_id}/${uuid}-${filename}` and only
-- that conversation's two participants can read or upload. The check runs as
-- the caller: conversations RLS already lets them see only their own chats.
insert into storage.buckets (id, name, public, file_size_limit)
values ('message-attachments', 'message-attachments', false, 26214400)
on conflict (id) do nothing;

create or replace function public.is_conversation_participant(p_conversation text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.conversations c
    where c.id::text = p_conversation
      and (select auth.uid()) in (c.participant_one_id, c.participant_two_id)
  );
$$;

revoke execute on function public.is_conversation_participant(text) from public, anon;
grant execute on function public.is_conversation_participant(text) to authenticated;

create policy "participants can read chat attachments"
  on storage.objects for select to authenticated
  using (bucket_id = 'message-attachments' and public.is_conversation_participant((storage.foldername(name))[1]));

create policy "participants can upload chat attachments"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'message-attachments' and public.is_conversation_participant((storage.foldername(name))[1]));

create policy "uploader can delete own chat attachments"
  on storage.objects for delete to authenticated
  using (bucket_id = 'message-attachments' and owner_id = (select auth.uid())::text);
