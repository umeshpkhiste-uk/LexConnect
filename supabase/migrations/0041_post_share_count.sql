-- Tracks how many times a post has been shared out of the app (native share
-- sheet), for a Facebook-style stat row (likes / comments / shares). Anyone
-- who can see the post can share it, not just its author, so the counter
-- can't be bumped by a plain client-side UPDATE (posts' RLS only allows the
-- author to update their own row) — a narrowly-scoped function does it.
alter table public.posts add column share_count integer not null default 0;

create or replace function public.increment_post_share(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_see_post(p_post_id) then
    raise exception 'Post not found';
  end if;
  update public.posts set share_count = share_count + 1 where id = p_post_id;
end;
$$;

revoke execute on function public.increment_post_share(uuid) from public, anon;
grant execute on function public.increment_post_share(uuid) to authenticated;
