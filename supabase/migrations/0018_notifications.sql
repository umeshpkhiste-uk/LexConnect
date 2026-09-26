-- Phase 5c: in-app notifications (spec §21). Scope note: this delivers
-- real, persisted notifications the app displays in-session and via an
-- unread badge — it does NOT push to the device when the app is closed.
-- That needs expo-notifications, device push-token registration, and an
-- Edge Function (or similar) calling Expo's push API whenever notify() below
-- fires; the trigger layer here is exactly the hook a future push sender
-- would attach to, so none of this is wasted when that's added.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.advocate_profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_id_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

create policy "advocate can read own notifications"
  on public.notifications for select
  using ((select auth.uid()) = recipient_id);

create policy "advocate can update own notifications"
  on public.notifications for update
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Deliberately no INSERT policy: nobody writes notifications directly from
-- the client (that would let anyone spoof a notification into anyone
-- else's inbox). Only the SECURITY DEFINER trigger functions below can
-- insert, since they run as the table owner and bypass RLS entirely.

create or replace function public.notify(
  p_recipient_id uuid, p_type text, p_title text, p_body text default null, p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, type, title, body, data)
  values (p_recipient_id, p_type, p_title, p_body, p_data);
end;
$$;

revoke execute on function public.notify(uuid, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.trg_notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_sender_name text;
begin
  select case when c.participant_one_id = new.sender_id then c.participant_two_id else c.participant_one_id end
    into v_recipient
  from public.conversations c where c.id = new.conversation_id;

  select full_name into v_sender_name from public.advocate_profiles where id = new.sender_id;

  perform public.notify(v_recipient, 'new_message', coalesce(v_sender_name, 'Someone') || ' sent you a message',
    left(new.content, 140), jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end;
$$;

create trigger messages_notify_recipient
  after insert on public.messages
  for each row execute function public.trg_notify_new_message();

create or replace function public.trg_notify_connection_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_name text;
begin
  select full_name into v_requester_name from public.advocate_profiles where id = new.requester_id;
  perform public.notify(new.addressee_id, 'connection_request',
    coalesce(v_requester_name, 'Someone') || ' sent you a connection request', null,
    jsonb_build_object('connection_id', new.id, 'actor_id', new.requester_id));
  return new;
end;
$$;

create trigger connections_notify_request
  after insert on public.connections
  for each row execute function public.trg_notify_connection_request();

create or replace function public.trg_notify_connection_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_addressee_name text;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    select full_name into v_addressee_name from public.advocate_profiles where id = new.addressee_id;
    perform public.notify(new.requester_id, 'connection_accepted',
      coalesce(v_addressee_name, 'Someone') || ' accepted your connection request', null,
      jsonb_build_object('connection_id', new.id, 'actor_id', new.addressee_id));
  end if;
  return new;
end;
$$;

create trigger connections_notify_accepted
  after update on public.connections
  for each row execute function public.trg_notify_connection_accepted();

create or replace function public.trg_notify_new_follower()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_follower_name text;
begin
  select full_name into v_follower_name from public.advocate_profiles where id = new.follower_id;
  perform public.notify(new.following_id, 'new_follower', coalesce(v_follower_name, 'Someone') || ' followed you',
    null, jsonb_build_object('actor_id', new.follower_id));
  return new;
end;
$$;

create trigger follows_notify_followed
  after insert on public.follows
  for each row execute function public.trg_notify_new_follower();

create or replace function public.trg_notify_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_actor_name text;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new; -- don't notify yourself for liking your own post
  end if;
  select full_name into v_actor_name from public.advocate_profiles where id = new.user_id;
  perform public.notify(v_author_id, 'post_liked', coalesce(v_actor_name, 'Someone') || ' liked your post',
    null, jsonb_build_object('post_id', new.post_id, 'actor_id', new.user_id));
  return new;
end;
$$;

create trigger reactions_notify_author
  after insert on public.reactions
  for each row execute function public.trg_notify_post_reaction();

create or replace function public.trg_notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_actor_name text;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.author_id then
    return new;
  end if;
  select full_name into v_actor_name from public.advocate_profiles where id = new.author_id;
  perform public.notify(v_author_id, 'post_commented', coalesce(v_actor_name, 'Someone') || ' commented on your post',
    left(new.content, 140), jsonb_build_object('post_id', new.post_id, 'actor_id', new.author_id));
  return new;
end;
$$;

create trigger comments_notify_author
  after insert on public.comments
  for each row execute function public.trg_notify_post_comment();
