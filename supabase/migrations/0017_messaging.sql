-- Phase 5a: 1-to-1 private messaging (spec §27). Same ownership pattern as
-- everywhere else, plus a trigger that stops anyone but a message's own
-- sender from altering its content or delete-flag even though both
-- conversation participants need UPDATE access (to mark things read).

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_one_id uuid not null references public.advocate_profiles (id) on delete cascade,
  participant_two_id uuid not null references public.advocate_profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (participant_one_id <> participant_two_id)
);

create unique index conversations_unique_pair_idx
  on public.conversations (least(participant_one_id, participant_two_id), greatest(participant_one_id, participant_two_id));

alter table public.conversations enable row level security;

create policy "advocate can read own conversations"
  on public.conversations for select
  using ((select auth.uid()) in (participant_one_id, participant_two_id));

-- Messaging is connection-gated (spec doesn't mandate this, but an open
-- professional network with unrestricted DMs is an obvious spam/abuse
-- vector) and blocked pairs can never start a new conversation.
create policy "advocate can start conversation with a connection"
  on public.conversations for insert
  with check (
    (select auth.uid()) in (participant_one_id, participant_two_id)
    and exists (
      select 1 from public.connections
      where status = 'accepted'
        and least(requester_id, addressee_id) = least(participant_one_id, participant_two_id)
        and greatest(requester_id, addressee_id) = greatest(participant_one_id, participant_two_id)
    )
    and not exists (
      select 1 from public.blocks
      where (blocker_id = participant_one_id and blocked_id = participant_two_id)
         or (blocker_id = participant_two_id and blocked_id = participant_one_id)
    )
  );

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.advocate_profiles (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  is_deleted boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "advocate can read messages in own conversations"
  on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.participant_one_id, c.participant_two_id)
  ));

create policy "advocate can send messages in own conversations"
  on public.messages for insert
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.participant_one_id, c.participant_two_id)
    )
  );

-- Both participants can UPDATE a row (needed so the recipient can set
-- read_at) — the trigger below is what actually stops a recipient from
-- editing someone else's message content or deleting it out from under them.
create policy "conversation participant can update messages"
  on public.messages for update
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.participant_one_id, c.participant_two_id)
  ))
  with check (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.participant_one_id, c.participant_two_id)
  ));

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
  if (select auth.uid()) <> old.sender_id and (new.content <> old.content or new.is_deleted <> old.is_deleted) then
    raise exception 'Only the sender can edit or delete a message';
  end if;
  return new;
end;
$$;

create trigger messages_protect_ownership
  before update on public.messages
  for each row execute function public.protect_message_ownership();

create or replace function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

revoke execute on function public.touch_conversation_last_message() from public, anon, authenticated;

create trigger messages_touch_conversation
  after insert on public.messages
  for each row execute function public.touch_conversation_last_message();
