-- Phase 2: client and case management — the foundational practice-management
-- tables everything else (hearings, meetings, documents, financials) will
-- reference in later phases. Same ownership pattern as advocate_profiles:
-- every row belongs to exactly one advocate, enforced via RLS, never via
-- app-level filtering alone.

create extension if not exists "pg_trgm";

create type public.client_type as enum ('individual', 'organization');

create type public.case_status as enum (
  'draft',
  'active',
  'pending',
  'adjourned',
  'disposed',
  'closed',
  'archived'
);

create type public.case_priority as enum ('low', 'medium', 'high');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  full_name text not null,
  client_type public.client_type not null default 'individual',
  phone text,
  email text,
  address text,
  notes text,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_advocate_id_idx on public.clients (advocate_id, is_archived);
create index clients_full_name_trgm_idx on public.clients using gin (full_name gin_trgm_ops);

alter table public.clients enable row level security;

create policy "advocate can read own clients"
  on public.clients for select
  using (auth.uid() = advocate_id);

create policy "advocate can insert own clients"
  on public.clients for insert
  with check (auth.uid() = advocate_id);

create policy "advocate can update own clients"
  on public.clients for update
  using (auth.uid() = advocate_id)
  with check (auth.uid() = advocate_id);

-- No delete policy: clients are archived (is_archived), never hard-deleted,
-- so case/financial history referencing them stays intact (spec §9, §32).

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  title text not null,
  case_number text,
  case_type text,
  court text,
  bench text,
  filing_date date,
  registration_date date,
  status public.case_status not null default 'draft',
  priority public.case_priority not null default 'medium',
  opposite_party text,
  description text,
  internal_notes text,
  tags text[] not null default '{}',
  -- Denormalized for the "open case -> immediately see next hearing" mobile
  -- UX goal (spec §52). Populated by the hearings module in a later phase;
  -- nullable and unused until then, not a fabricated value.
  next_hearing_at timestamptz,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cases_advocate_id_idx on public.cases (advocate_id, is_archived, status);
create index cases_client_id_idx on public.cases (client_id);
create index cases_title_trgm_idx on public.cases using gin (title gin_trgm_ops);
create index cases_case_number_trgm_idx on public.cases using gin (case_number gin_trgm_ops);

alter table public.cases enable row level security;

create policy "advocate can read own cases"
  on public.cases for select
  using (auth.uid() = advocate_id);

create policy "advocate can insert own cases"
  on public.cases for insert
  with check (
    auth.uid() = advocate_id
    -- Prevents attaching a case to another advocate's client, which would
    -- otherwise be a private-data leak vector even under per-row RLS.
    and exists (
      select 1 from public.clients
      where clients.id = client_id and clients.advocate_id = auth.uid()
    )
  );

create policy "advocate can update own cases"
  on public.cases for update
  using (auth.uid() = advocate_id)
  with check (
    auth.uid() = advocate_id
    and exists (
      select 1 from public.clients
      where clients.id = client_id and clients.advocate_id = auth.uid()
    )
  );

create trigger cases_set_updated_at
  before update on public.cases
  for each row execute function public.set_updated_at();

-- Additional parties on a case beyond the primary client/opposite party
-- (spec §9: "A case can involve multiple parties").
create table public.case_participants (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  name text not null,
  role text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index case_participants_case_id_idx on public.case_participants (case_id);

alter table public.case_participants enable row level security;

-- Ownership is derived from the parent case rather than denormalized, so
-- there is exactly one source of truth for "who owns this case".
create policy "advocate can read own case participants"
  on public.case_participants for select
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = auth.uid()
  ));

create policy "advocate can insert own case participants"
  on public.case_participants for insert
  with check (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = auth.uid()
  ));

create policy "advocate can update own case participants"
  on public.case_participants for update
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = auth.uid()
  ));

create policy "advocate can delete own case participants"
  on public.case_participants for delete
  using (exists (
    select 1 from public.cases
    where cases.id = case_id and cases.advocate_id = auth.uid()
  ));
