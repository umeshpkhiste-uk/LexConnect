-- Social sign-in (Google / Facebook / Apple): take the display name from
-- whichever metadata field the provider fills ("full_name" or "name"),
-- falling back to the email's local part, and use the provider's avatar as
-- the starting profile photo. New users still go through onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.advocate_profiles (id, full_name, profile_photo_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New Advocate'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );
  return new;
end;
$$;
