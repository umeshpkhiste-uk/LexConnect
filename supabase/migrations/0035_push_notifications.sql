-- Push notifications. Every row in public.notifications (new message,
-- connection request, comment, ...) is also sent to the recipient's phones
-- through the `send-push` Edge Function, which calls the Expo push service.
-- Calendar reminders (hearings / meetings / tasks) are scheduled on the
-- device itself, so they need nothing here.

create extension if not exists pg_net;

-- One row per device (Expo push token).
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.advocate_profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "advocate can read own push tokens"
  on public.push_tokens for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "advocate can register own push tokens"
  on public.push_tokens for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "advocate can refresh own push tokens"
  on public.push_tokens for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "advocate can remove own push tokens"
  on public.push_tokens for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Marks a notification as pushed so the function sends it at most once.
alter table public.notifications add column pushed_at timestamptz;

-- In-app banners while the app is open come from Realtime.
alter publication supabase_realtime add table public.notifications;

create or replace function public.trg_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.push_tokens where user_id = new.recipient_id) then
    perform net.http_post(
      url := 'https://ujrosfflqevkytburevc.supabase.co/functions/v1/send-push',
      body := jsonb_build_object('notification_id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  end if;
  return new;
end;
$$;

revoke execute on function public.trg_push_notification() from public, anon, authenticated;

create trigger notifications_send_push
  after insert on public.notifications
  for each row execute function public.trg_push_notification();
