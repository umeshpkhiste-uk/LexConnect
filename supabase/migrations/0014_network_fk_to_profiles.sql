-- Repoints the network tables' user-reference columns from auth.users(id)
-- to public.advocate_profiles(id). Functionally equivalent (every auth user
-- gets an advocate_profiles row immediately via the signup trigger in
-- 0001), but PostgREST can only auto-embed related rows across an actual
-- foreign key — and it can't see into the auth schema at all. Without this,
-- a feed query has no way to pull each post's author name/photo in one
-- request; app code would otherwise need a second round-trip per post.

alter table public.posts
  drop constraint posts_author_id_fkey,
  add constraint posts_author_id_fkey
    foreign key (author_id) references public.advocate_profiles (id) on delete cascade;

alter table public.comments
  drop constraint comments_author_id_fkey,
  add constraint comments_author_id_fkey
    foreign key (author_id) references public.advocate_profiles (id) on delete cascade;

alter table public.reactions
  drop constraint reactions_user_id_fkey,
  add constraint reactions_user_id_fkey
    foreign key (user_id) references public.advocate_profiles (id) on delete cascade;

alter table public.follows
  drop constraint follows_follower_id_fkey,
  add constraint follows_follower_id_fkey
    foreign key (follower_id) references public.advocate_profiles (id) on delete cascade;

alter table public.follows
  drop constraint follows_following_id_fkey,
  add constraint follows_following_id_fkey
    foreign key (following_id) references public.advocate_profiles (id) on delete cascade;

alter table public.connections
  drop constraint connections_requester_id_fkey,
  add constraint connections_requester_id_fkey
    foreign key (requester_id) references public.advocate_profiles (id) on delete cascade;

alter table public.connections
  drop constraint connections_addressee_id_fkey,
  add constraint connections_addressee_id_fkey
    foreign key (addressee_id) references public.advocate_profiles (id) on delete cascade;
