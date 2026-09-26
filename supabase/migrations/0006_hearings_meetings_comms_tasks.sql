-- Completes Phase 2 (Practice Management): hearings, meetings, client
-- communications, and tasks. Same ownership + RLS pattern as clients/cases.
-- All of these attach to a case (and hearings/meetings/tasks may also stand
-- alone against just a client), so every insert/update policy re-verifies
-- the parent case/client belongs to the acting advocate — the same
-- cross-tenant leak guard used for cases -> clients in 0004.

create type public.hearing_status as enum ('scheduled', 'completed', 'adjourned', 'cancelled', 'unknown');

create table public.hearings (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  court text,
  courtroom text,
  hearing_at timestamptz not null,
  hearing_type text,
  purpose text,
  status public.hearing_status not null default 'scheduled',
  notes text,
  -- Populated when the advocate records the outcome after the hearing
  -- (spec §12: "what happened, arguments, orders, next action").
  outcome text,
  arguments text,
  orders text,
  next_action text,
  next_hearing_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index hearings_advocate_id_idx on public.hearings (advocate_id, hearing_at);
create index hearings_case_id_idx on public.hearings (case_id, hearing_at);

alter table public.hearings enable row level security;

create policy "advocate can read own hearings"
  on public.hearings for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own hearings"
  on public.hearings for insert
  with check (
    (select auth.uid()) = advocate_id
    and exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid()))
  );

create policy "advocate can update own hearings"
  on public.hearings for update
  using ((select auth.uid()) = advocate_id)
  with check (
    (select auth.uid()) = advocate_id
    and exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid()))
  );

create policy "advocate can delete own hearings"
  on public.hearings for delete
  using ((select auth.uid()) = advocate_id);

create trigger hearings_set_updated_at
  before update on public.hearings
  for each row execute function public.set_updated_at();

-- Completing a hearing keeps the parent case's denormalized next-hearing
-- pointer (spec §52 "open case -> immediately see next hearing") in sync,
-- and rolls a scheduled hearing's date onto the case if it's the soonest.
create or replace function public.sync_case_next_hearing()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_case_id uuid := coalesce(new.case_id, old.case_id);
  soonest timestamptz;
begin
  select min(hearing_at) into soonest
  from public.hearings
  where case_id = target_case_id and status = 'scheduled' and hearing_at >= now();

  update public.cases set next_hearing_at = soonest where id = target_case_id;
  return null;
end;
$$;

create trigger hearings_sync_case_next_hearing
  after insert or update or delete on public.hearings
  for each row execute function public.sync_case_next_hearing();

create type public.meeting_type as enum (
  'client_meeting',
  'opposite_counsel_meeting',
  'internal_meeting',
  'court_related_meeting',
  'consultation',
  'other'
);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  meeting_type public.meeting_type not null default 'client_meeting',
  meeting_at timestamptz not null,
  location text,
  participants text,
  discussion_notes text,
  decisions text,
  follow_up_actions text,
  created_at timestamptz not null default now()
);

create index meetings_advocate_id_idx on public.meetings (advocate_id, meeting_at);
create index meetings_case_id_idx on public.meetings (case_id);
create index meetings_client_id_idx on public.meetings (client_id);

alter table public.meetings enable row level security;

create policy "advocate can read own meetings"
  on public.meetings for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own meetings"
  on public.meetings for insert
  with check (
    (select auth.uid()) = advocate_id
    and (case_id is null or exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid())))
    and (client_id is null or exists (select 1 from public.clients where clients.id = client_id and clients.advocate_id = (select auth.uid())))
  );

create policy "advocate can update own meetings"
  on public.meetings for update
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "advocate can delete own meetings"
  on public.meetings for delete
  using ((select auth.uid()) = advocate_id);

create type public.communication_type as enum (
  'phone_call', 'email', 'meeting', 'sms', 'whatsapp_manual', 'video_call', 'other'
);

create table public.communications (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete cascade,
  case_id uuid references public.cases (id) on delete set null,
  communication_type public.communication_type not null,
  occurred_at timestamptz not null default now(),
  summary text not null,
  follow_up text,
  created_at timestamptz not null default now()
);

create index communications_advocate_id_idx on public.communications (advocate_id, occurred_at);
create index communications_client_id_idx on public.communications (client_id);
create index communications_case_id_idx on public.communications (case_id);

alter table public.communications enable row level security;

create policy "advocate can read own communications"
  on public.communications for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own communications"
  on public.communications for insert
  with check (
    (select auth.uid()) = advocate_id
    and exists (select 1 from public.clients where clients.id = client_id and clients.advocate_id = (select auth.uid()))
    and (case_id is null or exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid())))
  );

create policy "advocate can update own communications"
  on public.communications for update
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "advocate can delete own communications"
  on public.communications for delete
  using ((select auth.uid()) = advocate_id);

create type public.task_status as enum ('todo', 'in_progress', 'completed');
create type public.task_priority as enum ('low', 'medium', 'high');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  title text not null,
  description text,
  due_at timestamptz,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_advocate_id_idx on public.tasks (advocate_id, status, due_at);
create index tasks_case_id_idx on public.tasks (case_id);

alter table public.tasks enable row level security;

create policy "advocate can read own tasks"
  on public.tasks for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own tasks"
  on public.tasks for insert
  with check (
    (select auth.uid()) = advocate_id
    and (case_id is null or exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid())))
    and (client_id is null or exists (select 1 from public.clients where clients.id = client_id and clients.advocate_id = (select auth.uid())))
  );

create policy "advocate can update own tasks"
  on public.tasks for update
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "advocate can delete own tasks"
  on public.tasks for delete
  using ((select auth.uid()) = advocate_id);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
