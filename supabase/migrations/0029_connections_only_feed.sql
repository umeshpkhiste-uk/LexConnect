-- The feed is for your network: you see (and can comment on / react to)
-- your own posts and posts by advocates you're connected with (accepted),
-- and nothing from anyone blocked in either direction.

create or replace function public.can_see_posts_of(p_author uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select p_author = (select auth.uid())
    or (
      exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and least(c.requester_id, c.addressee_id) = least(p_author, (select auth.uid()))
          and greatest(c.requester_id, c.addressee_id) = greatest(p_author, (select auth.uid()))
      )
      and not exists (
        select 1 from public.blocks b
        where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_author)
           or (b.blocker_id = p_author and b.blocked_id = (select auth.uid()))
      )
    );
$$;

revoke execute on function public.can_see_posts_of(uuid) from public, anon;
grant execute on function public.can_see_posts_of(uuid) to authenticated;

create or replace function public.can_see_post(p_post uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (select 1 from public.posts p where p.id = p_post);
$$;

revoke execute on function public.can_see_post(uuid) from public, anon;
grant execute on function public.can_see_post(uuid) to authenticated;

-- Posts
drop policy "authenticated can read posts" on public.posts;
create policy "advocate can read own and connections' posts"
  on public.posts for select to authenticated
  using (public.can_see_posts_of(author_id));

-- Comments: visible and addable only on posts you can see.
drop policy "authenticated can read comments" on public.comments;
create policy "advocate can read comments on visible posts"
  on public.comments for select to authenticated
  using (public.can_see_post(post_id));

drop policy "advocate can create own comments" on public.comments;
create policy "advocate can comment on visible posts"
  on public.comments for insert to authenticated
  with check ((select auth.uid()) = author_id and public.can_see_post(post_id));

-- Reactions (endorse / heart): same rule.
drop policy "authenticated can read reactions" on public.reactions;
create policy "advocate can read reactions on visible posts"
  on public.reactions for select to authenticated
  using (public.can_see_post(post_id));

drop policy "advocate can react to posts" on public.reactions;
create policy "advocate can react to visible posts"
  on public.reactions for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_see_post(post_id));
