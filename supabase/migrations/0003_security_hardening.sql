-- Addresses findings from the Supabase security advisor after 0001/0002:
--
-- 1. set_updated_at() had no fixed search_path, so a malicious role owning an
--    object earlier in a mutable search_path could shadow objects it touches.
-- 2. handle_new_user() and log_audit_event() are SECURITY DEFINER functions.
--    Postgres grants EXECUTE to PUBLIC by default on function creation, which
--    means anon/authenticated could call them directly over PostgREST's
--    auto-exposed /rpc/ endpoints — handle_new_user has no business being
--    called directly at all (it only runs via the auth.users trigger, which
--    doesn't need an explicit EXECUTE grant to fire), and log_audit_event
--    should only be callable by signed-in advocates, not anon.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

revoke execute on function public.log_audit_event(text, text, uuid, jsonb) from public, anon;
-- authenticated keeps EXECUTE (granted in 0002); this is intentional, not a finding.
