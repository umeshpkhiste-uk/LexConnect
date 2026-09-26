-- Basic personal information + notification preference on the advocate's
-- own profile row. advocate_profiles is owner-only readable (RLS), and the
-- public_advocate_profiles view selects an explicit column list, so none of
-- these new columns are exposed to other advocates.

alter table public.advocate_profiles
  add column date_of_birth date check (date_of_birth is null or date_of_birth <= current_date),
  add column gender text check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say')),
  add column phone text check (phone is null or phone ~ '^\+?[0-9 ]{7,16}$'),
  add column address_line text,
  add column pincode text check (pincode is null or pincode ~ '^[0-9]{6}$'),
  add column notifications_enabled boolean not null default true;

comment on column public.advocate_profiles.notifications_enabled is
  'When false, notify() skips creating in-app notifications for this advocate.';

-- Respect the advocate's preference at the single choke point every
-- notification trigger goes through.
create or replace function public.notify(
  p_recipient_id uuid, p_type text, p_title text, p_body text default null, p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.advocate_profiles
    where id = p_recipient_id and notifications_enabled = false
  ) then
    return;
  end if;

  insert into public.notifications (recipient_id, type, title, body, data)
  values (p_recipient_id, p_type, p_title, p_body, p_data);
end;
$$;

revoke execute on function public.notify(uuid, text, text, text, jsonb) from public, anon, authenticated;
