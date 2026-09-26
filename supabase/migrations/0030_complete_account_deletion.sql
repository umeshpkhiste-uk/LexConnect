-- Account deletion must leave nothing behind. Everything owned by the user
-- already cascades from auth.users / advocate_profiles; this also removes
-- rows that only *mention* the user:
--  * other people's notifications about them (actor_id), including message
--    notifications from their conversations (which carry message text);
--  * their audit-log entries (the FK is ON DELETE SET NULL, which would keep
--    the history around anonymised).
-- Uploaded files are removed by the app before this runs (storage objects
-- must be deleted through the Storage API, not SQL).

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := (select auth.uid());
begin
  if v_me is null then
    raise exception 'Not signed in';
  end if;

  delete from public.notifications
  where data ->> 'actor_id' = v_me::text
     or data ->> 'conversation_id' in (
       select c.id::text from public.conversations c
       where v_me in (c.participant_one_id, c.participant_two_id)
     );

  delete from public.audit_logs where user_id = v_me;

  delete from auth.users where id = v_me;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
