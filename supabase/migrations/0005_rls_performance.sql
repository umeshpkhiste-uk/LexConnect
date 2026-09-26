-- Performance advisor finding: bare auth.uid() (and other auth.<fn>()) calls
-- in RLS policies get re-evaluated once per row instead of once per query.
-- Wrapping them as (select auth.uid()) lets Postgres treat it as a stable
-- subplan. Applies retroactively to every policy from 0001-0004 — cheap now,
-- expensive to have missed once these tables have real row counts (spec §43).

alter policy "advocate can read own profile" on public.advocate_profiles
  using ((select auth.uid()) = id);

alter policy "advocate can update own profile" on public.advocate_profiles
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

alter policy "advocate can insert own profile" on public.advocate_profiles
  with check ((select auth.uid()) = id);

alter policy "advocate can read own audit log" on public.audit_logs
  using ((select auth.uid()) = user_id);

alter policy "advocate can read own clients" on public.clients
  using ((select auth.uid()) = advocate_id);

alter policy "advocate can insert own clients" on public.clients
  with check ((select auth.uid()) = advocate_id);

alter policy "advocate can update own clients" on public.clients
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

alter policy "advocate can read own cases" on public.cases
  using ((select auth.uid()) = advocate_id);

alter policy "advocate can insert own cases" on public.cases
  with check (
    (select auth.uid()) = advocate_id
    and exists (
      select 1 from public.clients
      where clients.id = client_id and clients.advocate_id = (select auth.uid())
    )
  );

alter policy "advocate can update own cases" on public.cases
  using ((select auth.uid()) = advocate_id)
  with check (
    (select auth.uid()) = advocate_id
    and exists (
      select 1 from public.clients
      where clients.id = client_id and clients.advocate_id = (select auth.uid())
    )
  );

alter policy "advocate can read own case participants" on public.case_participants
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = (select auth.uid())
  ));

alter policy "advocate can insert own case participants" on public.case_participants
  with check (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = (select auth.uid())
  ));

alter policy "advocate can update own case participants" on public.case_participants
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = (select auth.uid())
  ));

alter policy "advocate can delete own case participants" on public.case_participants
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = (select auth.uid())
  ));
