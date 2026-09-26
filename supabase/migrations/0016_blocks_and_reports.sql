-- Phase 5b: blocking and reporting (spec §24, §37).

create table public.blocks (
  blocker_id uuid not null references public.advocate_profiles (id) on delete cascade,
  blocked_id uuid not null references public.advocate_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

-- A caller can see blocks they made AND blocks made against them. That
-- second half is a deliberate, documented trade-off: it means a blocked
-- user could in principle query the API directly and learn they were
-- blocked (the app UI never surfaces this), but it's what lets the app
-- correctly hide a blocker from the blocked user's own search/discover
-- results and stop them from re-requesting a connection. Restricting reads
-- to blocker_id = auth.uid() only would make that hiding impossible.
create policy "advocate can read blocks involving them"
  on public.blocks for select
  using ((select auth.uid()) in (blocker_id, blocked_id));

create policy "advocate can block others"
  on public.blocks for insert
  with check ((select auth.uid()) = blocker_id);

create policy "advocate can unblock"
  on public.blocks for delete
  using ((select auth.uid()) = blocker_id);

create type public.report_target_type as enum ('advocate', 'post', 'comment', 'message', 'conversation');
create type public.report_status as enum ('open', 'reviewed', 'actioned', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.advocate_profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  -- Polymorphic reference (advocate/post/comment/message/conversation all
  -- have different id spaces) — no FK possible across a variable target
  -- table, so target existence is validated by the app layer, not Postgres.
  target_id uuid not null,
  reason text not null check (char_length(reason) between 1 and 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now()
);

create index reports_reporter_id_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

-- No admin role exists yet (spec §36's admin panel is out of scope for this
-- phase), so reports are currently write-only from the reporter's
-- perspective plus read-your-own-submissions — nobody can read someone
-- else's report. Reviewing reports is future work once an admin role ships.
create policy "advocate can read own reports"
  on public.reports for select
  using ((select auth.uid()) = reporter_id);

create policy "advocate can submit reports"
  on public.reports for insert
  with check ((select auth.uid()) = reporter_id);

-- Retroactively make connection requests and follows respect blocks (both
-- tables predate this migration, from Phase 4, before blocking existed).
alter policy "advocate can send connection request" on public.connections
  with check (
    (select auth.uid()) = requester_id
    and not exists (
      select 1 from public.blocks
      where (blocker_id = requester_id and blocked_id = addressee_id)
         or (blocker_id = addressee_id and blocked_id = requester_id)
    )
  );

alter policy "advocate can follow others" on public.follows
  with check (
    (select auth.uid()) = follower_id
    and not exists (
      select 1 from public.blocks
      where (blocker_id = follower_id and blocked_id = following_id)
         or (blocker_id = following_id and blocked_id = follower_id)
    )
  );
