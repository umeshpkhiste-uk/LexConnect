-- Chat-style feed threads: file attachments on posts, two more reaction
-- kinds alongside endorse/heart, and live comments so a post's replies
-- update in real time the way direct messages already do (0025).

-- A post can carry multiple files (pdf, ppt, xls, etc.) in addition to the
-- single image/video already supported by posts.image_path / video_path.
create table public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  file_path text not null,
  file_name text not null,
  file_size integer,
  mime_type text,
  created_at timestamptz not null default now()
);

create index post_attachments_post_id_idx on public.post_attachments (post_id);

alter table public.post_attachments enable row level security;

create policy "advocate can read attachments on visible posts"
  on public.post_attachments for select to authenticated
  using (public.can_see_post(post_id));

create policy "advocate can attach files to own posts"
  on public.post_attachments for insert to authenticated
  with check (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

create policy "advocate can remove own post attachments"
  on public.post_attachments for delete to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.author_id = (select auth.uid())));

-- Public bucket, same reasoning as post-images (0013): posts are the one
-- kind of content in this app meant to be publicly viewable within the
-- network, so reads skip storage.objects RLS entirely via the public URL.
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-attachments', 'post-attachments', true, 26214400)
on conflict (id) do nothing;

create policy "advocate can upload own post attachment files"
  on storage.objects for insert
  with check (bucket_id = 'post-attachments' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can delete own post attachment files"
  on storage.objects for delete
  using (bucket_id = 'post-attachments' and (select auth.uid())::text = (storage.foldername(name))[1]);

-- Two more reactions alongside endorse/heart: "eyes" (seen it) and "pray"
-- (thank you) — the small emoji-pill row seen on chat-style threads.
alter table public.reactions drop constraint reactions_kind_check;
alter table public.reactions add constraint reactions_kind_check check (kind in ('endorse', 'heart', 'eyes', 'pray'));

-- likes_count / hearts_count keep their names so existing readers don't
-- break; eyes_count / pray_count are appended (create or replace can only
-- add columns at the end).
create or replace view public.post_stats
  with (security_invoker = true) as
select
  posts.id as post_id,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'endorse') as likes_count,
  (select count(*) from public.comments where comments.post_id = posts.id) as comments_count,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'heart') as hearts_count,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'eyes') as eyes_count,
  (select count(*) from public.reactions where reactions.post_id = posts.id and reactions.kind = 'pray') as pray_count
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
  v_verb text;
begin
  select author_id into v_author_id from public.posts where id = new.post_id;
  if v_author_id is null or v_author_id = new.user_id then
    return new; -- don't notify yourself for reacting to your own post
  end if;
  select full_name into v_actor_name from public.advocate_profiles where id = new.user_id;
  v_verb := case new.kind
    when 'heart' then ' loved your post'
    when 'eyes' then ' noted your post'
    when 'pray' then ' thanked you for your post'
    else ' endorsed your post'
  end;
  perform public.notify(
    v_author_id,
    case when new.kind = 'heart' then 'post_hearted' else 'post_liked' end,
    coalesce(v_actor_name, 'Someone') || v_verb,
    null,
    jsonb_build_object('post_id', new.post_id, 'actor_id', new.user_id)
  );
  return new;
end;
$$;

-- Live threads: replies stream in while a post's comments are open, the
-- same way messages do in a direct chat.
alter publication supabase_realtime add table public.comments;
