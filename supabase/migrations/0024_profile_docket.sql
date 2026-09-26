-- Profile docket: professional credentials, chambers, onboarding state and
-- profile photos.

alter table public.advocate_profiles
  -- [{ "degree": "LL.M", "institution": "NLSIU", "year": "2012", "note": "Gold medal" }]
  add column education jsonb not null default '[]'::jsonb check (jsonb_typeof(education) = 'array'),
  add column bar_memberships text[] not null default '{}',
  -- Private: chambers/office address. Never in the public view.
  add column chamber_address text,
  -- Null until the advocate finishes (or skips) the first-login profile setup.
  add column onboarding_completed_at timestamptz;

-- Everyone who already has an account has effectively onboarded; only new
-- sign-ups should see the setup screen.
update public.advocate_profiles set onboarding_completed_at = now() where onboarding_completed_at is null;

-- Education and bar memberships are professional credentials, shown to other
-- advocates like practice areas and courts. Chamber address, phone, DOB,
-- gender, home address and bar enrolment number stay owner-only.
-- (create or replace can only append columns; security_invoker stays false —
-- see 0015 for why.)
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
  (verification_status = 'verified') as is_verified,
  case when contact_info_visible then contact_preferences else '{}'::jsonb end as contact_preferences,
  created_at,
  education,
  bar_memberships
from public.advocate_profiles
where profile_visibility in ('public', 'connections_only');

-- Profile photos: public bucket (avatars appear across the network), each
-- advocate may only write inside their own <uid>/ folder.
insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', true)
on conflict (id) do nothing;

create policy "advocate can upload own profile photo"
  on storage.objects for insert
  with check (bucket_id = 'profile-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can replace own profile photo"
  on storage.objects for update
  using (bucket_id = 'profile-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can delete own profile photo"
  on storage.objects for delete
  using (bucket_id = 'profile-photos' and (select auth.uid())::text = (storage.foldername(name))[1]);
