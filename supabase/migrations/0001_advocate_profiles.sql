-- Phase 1: authentication + advocate professional profile foundation.
-- Establishes the core privacy principle from the product spec:
-- practice data (added in later phases) is private-by-default and owned by
-- exactly one advocate; profile data is public-by-choice via explicit
-- visibility flags. Enforced here at the database level via RLS, not just
-- in application code.

create extension if not exists "pgcrypto";

create type public.verification_status as enum (
  'unverified',
  'pending',
  'verified',
  'rejected',
  'expired'
);

create type public.profile_visibility as enum (
  'public',
  'connections_only',
  'private'
);

-- One row per authenticated advocate. id mirrors auth.users.id (1:1),
-- so ownership checks are a simple `id = auth.uid()`.
create table public.advocate_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  headline text,
  about text,
  city text,
  state text,
  languages text[] not null default '{}',
  practice_areas text[] not null default '{}',
  courts text[] not null default '{}',
  years_of_experience smallint check (years_of_experience is null or years_of_experience >= 0),
  website text,
  profile_photo_url text,
  contact_preferences jsonb not null default '{}'::jsonb,

  -- Professional credentials/registration data. Never exposed publicly
  -- regardless of profile_visibility (spec: "Do NOT publicly expose sensitive
  -- verification information by default"). Only readable by the owner and,
  -- later, an admin/verifier role.
  bar_registration_number text,
  bar_council_state text,
  verification_status public.verification_status not null default 'unverified',
  verification_notes text,
  verified_at timestamptz,

  profile_visibility public.profile_visibility not null default 'public',
  contact_info_visible boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.advocate_profiles is
  'Public-by-choice professional profile. Private practice data (clients, cases, documents, finances) lives in separate tables added in later phases and is never joined to this table for cross-advocate reads.';
comment on column public.advocate_profiles.bar_registration_number is
  'Sensitive verification input. Excluded from public_advocate_profiles view.';

create index advocate_profiles_city_state_idx on public.advocate_profiles (state, city);
create index advocate_profiles_practice_areas_idx on public.advocate_profiles using gin (practice_areas);
create index advocate_profiles_courts_idx on public.advocate_profiles using gin (courts);

alter table public.advocate_profiles enable row level security;

-- Owner has full access to their own row, including sensitive fields.
create policy "advocate can read own profile"
  on public.advocate_profiles for select
  using (auth.uid() = id);

create policy "advocate can update own profile"
  on public.advocate_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "advocate can insert own profile"
  on public.advocate_profiles for insert
  with check (auth.uid() = id);

-- No delete policy: profile rows are removed only via the auth.users cascade
-- (account deletion flow, added in a later phase), never ad hoc from the client.

-- Public read access to the *table* is intentionally NOT granted here.
-- Cross-advocate discovery (Network search, §22-24) must go through the
-- public_advocate_profiles view below, which strips sensitive columns and
-- still respects profile_visibility.
revoke select on public.advocate_profiles from anon, authenticated;
grant select on public.advocate_profiles to authenticated; -- gated by the policy above (own row only)

-- Public professional view: only the fields the spec lists under
-- "PROFESSIONAL NETWORK DATA" (§2), and only for advocates who opted into
-- public or connections-only visibility. Bar registration number, internal
-- verification notes, and contact info are excluded unless the advocate
-- explicitly enabled contact_info_visible.
create view public.public_advocate_profiles
  with (security_invoker = true) as
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
  (verification_status = 'verified') as is_verified,
  case when contact_info_visible then contact_preferences else '{}'::jsonb end as contact_preferences,
  created_at
from public.advocate_profiles
where profile_visibility in ('public', 'connections_only');

grant select on public.public_advocate_profiles to authenticated;

-- Keep updated_at accurate without trusting the client to set it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger advocate_profiles_set_updated_at
  before update on public.advocate_profiles
  for each row execute function public.set_updated_at();

-- Auto-provision a profile row the moment someone signs up, using whatever
-- name they supplied at sign-up time (see src/features/auth/api.ts).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.advocate_profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'New Advocate'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
