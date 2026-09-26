-- Posts get two independent reactions: "endorse" (the professional nod)
-- and "heart". Existing reactions were endorsements. Each advocate can give
-- a post one of each.

alter table public.reactions
  add column kind text not null default 'endorse' check (kind in ('endorse', 'heart'));

alter table public.reactions drop constraint reactions_post_id_user_id_key;
alter table public.reactions add constraint reactions_post_id_user_id_kind_key unique (post_id, user_id, kind);

-- likes_count keeps its name (= endorsements) so existing readers don't
-- break; hearts_count is appended (create or replace can only add columns
-- at the end).
create or replace view public.post_stats
  with (security_invoker = true) as
select
  posts.id as post_id,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'endorse') as likes_count,
  (select count(*) from public.comments where comments.post_id = posts.id) as comments_count,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'heart') as hearts_count
from public.posts;

create or replace function public.trg_notify_post_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author_id uuid;
  v_actor_name text;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new; -- don't notify yourself for reacting to your own post
  end if;
  select full_name into v_actor_name from public.advocate_profiles where id = new.user_id;
  perform public.notify(
    v_author_id,
    case when new.kind = 'heart' then 'post_hearted' else 'post_liked' end,
    coalesce(v_actor_name, 'Someone') || case when new.kind = 'heart' then ' loved your post' else ' endorsed your post' end,
    null,
    jsonb_build_object('post_id', new.post_id, 'actor_id', new.user_id)
  );
  return new;
end;
$$;
