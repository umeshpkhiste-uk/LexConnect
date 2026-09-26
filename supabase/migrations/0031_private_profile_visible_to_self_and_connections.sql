-- A private profile was hidden even from its owner and their connections,
-- so their own posts showed as "Advocate" and tapping their name gave
-- "Profile not found". Private still keeps someone out of discovery, but
-- the owner and their accepted connections can now see it.
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
  verification_status = 'verified'::verification_status as is_verified,
  case when contact_info_visible then contact_preferences else '{}'::jsonb end as contact_preferences,
  created_at,
  education,
  bar_memberships
from public.advocate_profiles p
where p.profile_visibility = any (array['public'::profile_visibility, 'connections_only'::profile_visibility])
   or p.id = (select auth.uid())
   or exists (
     select 1 from public.connections c
     where c.status = 'accepted'
       and least(c.requester_id, c.addressee_id) = least(p.id, (select auth.uid()))
       and greatest(c.requester_id, c.addressee_id) = greatest(p.id, (select auth.uid()))
   );
