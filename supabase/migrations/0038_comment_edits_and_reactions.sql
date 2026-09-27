-- Comments become editable (with an "edited" indicator like posts) and can
-- carry the same reaction set as posts (endorse/heart/eyes/pray), plus the
-- author gets Edit/Delete on their own replies.

alter table public.comments add column updated_at timestamptz not null default now();

create trigger comments_set_updated_at
  before update on public.comments
  for each row execute function public.set_updated_at();

create policy "advocate can update own comments"
  on public.comments for update to authenticated
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create table public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('endorse', 'heart', 'eyes', 'pray')),
  created_at timestamptz not null default now(),
  unique (comment_id, user_id, kind)
);

create index comment_reactions_comment_id_idx on public.comment_reactions (comment_id);

alter table public.comment_reactions enable row level security;

create or replace function public.can_see_comment(p_comment uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.comments c
    where c.id = p_comment and public.can_see_post(c.post_id)
  );
$$;

revoke execute on function public.can_see_comment(uuid) from public, anon;
grant execute on function public.can_see_comment(uuid) to authenticated;

create policy "advocate can read reactions on visible comments"
  on public.comment_reactions for select to authenticated
  using (public.can_see_comment(comment_id));

create policy "advocate can react to visible comments"
  on public.comment_reactions for insert to authenticated
  with check ((select auth.uid()) = user_id and public.can_see_comment(comment_id));

create policy "advocate can remove own comment reaction"
  on public.comment_reactions for delete to authenticated
  using ((select auth.uid()) = user_id);

create view public.comment_stats
  with (security_invoker = true) as
select
  comments.id as comment_id,
  (select count(*) from public.comment_reactions where comment_reactions.comment_id = comments.id and comment_reactions.kind = 'endorse') as likes_count,
  (select count(*) from public.comment_reactions where comment_reactions.comment_id = comments.id and comment_reactions.kind = 'heart') as hearts_count,
  (select count(*) from public.comment_reactions where comment_reactions.comment_id = comments.id and comment_reactions.kind = 'eyes') as eyes_count,
  (select count(*) from public.comment_reactions where comment_reactions.comment_id = comments.id and comment_reactions.kind = 'pray') as pray_count
from public.comments;

grant select on public.comment_stats to authenticated;
