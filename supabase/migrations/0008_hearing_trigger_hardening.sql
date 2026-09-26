-- Same class of finding as 0003: a SECURITY DEFINER trigger function had no
-- reason to be reachable directly over PostgREST's auto-exposed /rpc/ path.
revoke execute on function public.sync_case_next_hearing() from public, anon, authenticated;
