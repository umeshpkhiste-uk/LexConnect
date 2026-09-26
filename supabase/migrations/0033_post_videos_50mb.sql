-- Lower the post video limit to 50 MB (the Supabase Free plan's global
-- upload maximum).
update storage.buckets set file_size_limit = 52428800 where id = 'post-videos';
