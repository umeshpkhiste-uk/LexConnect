-- Spec §35 (data backup/export/account deletion) and a hard App Store
-- requirement (Apple Guideline 5.1.1(v): apps with account creation must
-- offer in-app account deletion, not just "contact support").
--
-- A regular authenticated user cannot delete their own auth.users row —
-- that needs the service role / admin API. This SECURITY DEFINER function
-- is the standard Supabase pattern for self-service deletion: it runs as
-- its owner (which can write to the auth schema) but is hard-scoped to
-- auth.uid() below, so it can only ever delete the caller's own account,
-- never anyone else's. Every table in this app that references a user
-- (advocate_profiles and everything chained from it — clients, cases,
-- hearings, documents, transactions, posts, messages, ...) was created with
-- `on delete cascade`, so this one delete removes the advocate's entire
-- footprint. It does NOT remove their uploaded files from Storage —
-- src/features/account/api.ts clears those first, before calling this.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
