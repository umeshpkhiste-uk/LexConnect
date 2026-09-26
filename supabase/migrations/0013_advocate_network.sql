-- Phase 4: advocate professional network (spec §22-26). This is entirely
-- separate data from clients/cases/documents/transactions — no table here
-- references those, and none of them reference this. That separation is
-- the point: being connected to another advocate must never grant access to
-- their private practice data (spec §2, §24), and this migration can't
-- violate that even by accident because there's no join path between them.
--
-- Note: connection status intentionally has no 'blocked' value yet, and
-- there is no reports table. Per the roadmap, blocking/reporting ship in
-- the Messaging phase alongside private messages, which is where they're
-- actually needed first.

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  following_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create index follows_following_id_idx on public.follows (following_id);

alter table public.follows enable row level security;

-- A caller can only see follow edges that touch them directly — enough to
-- render "you follow this person" / "this person follows you", without
-- exposing anyone else's full social graph. Aggregate counts (safe to be
-- public) come from advocate_network_stats below instead.
create policy "advocate can read own follow edges"
  on public.follows for select
  using ((select auth.uid()) in (follower_id, following_id));

create policy "advocate can follow others"
  on public.follows for insert
  with check ((select auth.uid()) = follower_id);

create policy "advocate can unfollow"
  on public.follows for delete
  using ((select auth.uid()) = follower_id);

create type public.connection_status as enum ('pending', 'accepted', 'rejected');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status public.connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- Prevents A->B and B->A both existing as separate rows.
create unique index connections_unique_pair_idx
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create index connections_addressee_id_idx on public.connections (addressee_id, status);
create index connections_requester_id_idx on public.connections (requester_id, status);

alter table public.connections enable row level security;

create policy "advocate can read own connections"
  on public.connections for select
  using ((select auth.uid()) in (requester_id, addressee_id));

create policy "advocate can send connection request"
  on public.connections for insert
  with check ((select auth.uid()) = requester_id);

-- Either party can update (accept/reject by the addressee, or either side
-- cancelling/removing by changing status — the app UI decides which action
-- is offered to which party; the DB only enforces "you're party to this").
create policy "advocate can update own connections"
  on public.connections for update
  using ((select auth.uid()) in (requester_id, addressee_id))
  with check ((select auth.uid()) in (requester_id, addressee_id));

create policy "advocate can delete own connections"
  on public.connections for delete
  using ((select auth.uid()) in (requester_id, addressee_id));

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 3000),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);

alter table public.posts enable row level security;

-- The feed is public within the network (spec §25) — any signed-in advocate
-- can read any post. This is intentionally different from every other
-- table in this app: posts are the one thing advocates explicitly publish.
create policy "authenticated can read posts"
  on public.posts for select
  to authenticated
  using (true);

create policy "advocate can create own posts"
  on public.posts for insert
  with check ((select auth.uid()) = author_id);

create policy "advocate can update own posts"
  on public.posts for update
  using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);

create policy "advocate can delete own posts"
  on public.posts for delete
  using ((select auth.uid()) = author_id);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index comments_post_id_idx on public.comments (post_id, created_at);

alter table public.comments enable row level security;

create policy "authenticated can read comments"
  on public.comments for select
  to authenticated
  using (true);

create policy "advocate can create own comments"
  on public.comments for insert
  with check ((select auth.uid()) = author_id);

create policy "advocate can delete own comments"
  on public.comments for delete
  using ((select auth.uid()) = author_id);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index reactions_post_id_idx on public.reactions (post_id);

alter table public.reactions enable row level security;

create policy "authenticated can read reactions"
  on public.reactions for select
  to authenticated
  using (true);

create policy "advocate can react to posts"
  on public.reactions for insert
  with check ((select auth.uid()) = user_id);

create policy "advocate can remove own reaction"
  on public.reactions for delete
  using ((select auth.uid()) = user_id);

-- Aggregate stats. Counts alone reveal nothing sensitive, so these are safe
-- to expose broadly (unlike the raw follows/connections tables above).
create view public.post_stats
  with (security_invoker = true) as
select
  posts.id as post_id,
  (select count(*) from public.reactions where reactions.post_id = posts.id) as likes_count,
  (select count(*) from public.comments where comments.post_id = posts.id) as comments_count
from public.posts;

grant select on public.post_stats to authenticated;

create view public.advocate_network_stats
  with (security_invoker = true) as
select
  advocate_profiles.id as advocate_id,
  (select count(*) from public.follows where follows.following_id = advocate_profiles.id) as followers_count,
  (select count(*) from public.follows where follows.follower_id = advocate_profiles.id) as following_count,
  (select count(*) from public.connections
     where connections.status = 'accepted'
       and advocate_profiles.id in (connections.requester_id, connections.addressee_id)) as connections_count
from public.advocate_profiles;

grant select on public.advocate_network_stats to authenticated;

-- Public bucket: posts are the one kind of content in this app meant to be
-- publicly viewable, unlike documents (private, signed-URL-only). A public
-- bucket serves reads via its public URL without consulting storage.objects
-- RLS at all, so only an INSERT policy is needed here.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "advocate can upload own post images"
  on storage.objects for insert
  with check (bucket_id = 'post-images' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can delete own post images"
  on storage.objects for delete
  using (bucket_id = 'post-images' and (select auth.uid())::text = (storage.foldername(name))[1]);
