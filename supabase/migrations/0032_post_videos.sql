-- Video posts (up to 100 MB). Same shape as post images: a public bucket
-- where each advocate can only write inside their own folder, and the post
-- row points at the file.
alter table public.posts add column video_path text;

alter table public.posts
  add constraint posts_video_in_own_folder check (
    video_path is null or split_part(video_path, '/', 1) = author_id::text
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-videos', 'post-videos', true, 104857600, array['video/*'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "advocate can upload own post videos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-videos' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can delete own post videos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-videos' and (select auth.uid())::text = (storage.foldername(name))[1]);
