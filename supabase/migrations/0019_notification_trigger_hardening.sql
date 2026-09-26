-- Same class of finding as 0003/0008: these are trigger-only functions with
-- no reason to be reachable directly over PostgREST's auto-exposed /rpc/
-- path — a client calling them directly could spam arbitrary notifications.

revoke execute on function public.trg_notify_new_message() from public, anon, authenticated;
revoke execute on function public.trg_notify_connection_request() from public, anon, authenticated;
revoke execute on function public.trg_notify_connection_accepted() from public, anon, authenticated;
revoke execute on function public.trg_notify_new_follower() from public, anon, authenticated;
revoke execute on function public.trg_notify_post_reaction() from public, anon, authenticated;
revoke execute on function public.trg_notify_post_comment() from public, anon, authenticated;
