-- Mutual-connection counts for the "N mutual connections" line on advocate
-- cards. connections RLS only lets an advocate read rows they're part of,
-- so this can't be computed client-side; a SECURITY DEFINER function that
-- returns only counts (never who the mutual connections are) keeps the
-- privacy boundary intact — same reasoning as advocate_network_stats.

create or replace function public.mutual_connection_counts(p_targets uuid[])
returns table (target_id uuid, mutual_count integer)
language sql
stable
security definer
set search_path = public
as $$
  with mine as (
    select case when c.requester_id = (select auth.uid()) then c.addressee_id else c.requester_id end as friend_id
    from public.connections c
    where c.status = 'accepted'
      and (select auth.uid()) in (c.requester_id, c.addressee_id)
  ),
  targets as (
    -- Bounded so a single call can't be used to sweep the whole table.
    select distinct t.id from unnest(p_targets) as t(id) limit 100
  )
  select
    t.id as target_id,
    (
      select count(*)::integer
      from public.connections c
      join mine m
        on m.friend_id = case when c.requester_id = t.id then c.addressee_id else c.requester_id end
      where c.status = 'accepted'
        and t.id in (c.requester_id, c.addressee_id)
    ) as mutual_count
  from targets t;
$$;

revoke execute on function public.mutual_connection_counts(uuid[]) from public, anon;
grant execute on function public.mutual_connection_counts(uuid[]) to authenticated;
