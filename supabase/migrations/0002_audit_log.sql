-- Minimal audit log foundation (spec §31). Expanded in later phases as
-- case/client/document/financial actions are introduced.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_logs is
  'Append-only. Never store passwords, tokens, or document contents in metadata.';

create index audit_logs_user_id_idx on public.audit_logs (user_id, created_at desc);

alter table public.audit_logs enable row level security;

-- Advocates can see their own audit trail; nobody can write directly from
-- the client (writes happen via security-definer functions / server-side
-- triggers only), so there is no insert/update/delete policy for regular users.
create policy "advocate can read own audit log"
  on public.audit_logs for select
  using (auth.uid() = user_id);

revoke insert, update, delete on public.audit_logs from anon, authenticated;

create or replace function public.log_audit_event(
  p_action text,
  p_resource_type text,
  p_resource_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, resource_type, resource_id, metadata)
  values (auth.uid(), p_action, p_resource_type, p_resource_id, p_metadata);
end;
$$;

grant execute on function public.log_audit_event(text, text, uuid, jsonb) to authenticated;
