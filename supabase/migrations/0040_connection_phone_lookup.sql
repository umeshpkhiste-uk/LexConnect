-- Lets the Network tab show a "call" icon on an accepted connection's row.
-- Phone numbers stay private otherwise (advocate_profiles has owner-only
-- select RLS, and the public_advocate_profiles view — used far more broadly,
-- including for "public" visibility profiles anyone can see — deliberately
-- never includes it). This function narrowly exposes a phone number only
-- when the caller and that advocate have an accepted connection, regardless
-- of that advocate's profile_visibility setting.
create or replace function public.connection_phone_numbers(p_ids uuid[])
returns table (id uuid, phone text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.phone
  from public.advocate_profiles p
  join (select distinct t.id from unnest(p_ids) as t(id) limit 100) targets on targets.id = p.id
  where p.phone is not null
    and exists (
      select 1 from public.connections c
      where c.status = 'accepted'
        and least(c.requester_id, c.addressee_id) = least(p.id, (select auth.uid()))
        and greatest(c.requester_id, c.addressee_id) = greatest(p.id, (select auth.uid()))
    );
$$;

revoke execute on function public.connection_phone_numbers(uuid[]) from public, anon;
grant execute on function public.connection_phone_numbers(uuid[]) to authenticated;
