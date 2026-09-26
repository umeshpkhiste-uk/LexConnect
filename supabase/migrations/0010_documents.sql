-- Phase 3b: document management (spec §18). Files live in a PRIVATE Storage
-- bucket, never a public one — every read goes through a short-lived signed
-- URL (see src/features/documents/api.ts), satisfying "must not expose
-- private documents through public URLs". Storage path convention is
-- `${advocate_id}/${uuid}-${filename}`, which is also how storage-level RLS
-- scopes access: a Storage object's owning folder must equal the caller's
-- own auth.uid(), so this is enforced by Postgres, not just app code.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "advocate can read own documents in storage"
  on storage.objects for select
  using (bucket_id = 'documents' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can upload own documents to storage"
  on storage.objects for insert
  with check (bucket_id = 'documents' and (select auth.uid())::text = (storage.foldername(name))[1]);

create policy "advocate can delete own documents from storage"
  on storage.objects for delete
  using (bucket_id = 'documents' and (select auth.uid())::text = (storage.foldername(name))[1]);

create type public.document_category as enum (
  'pleadings', 'orders', 'evidence', 'agreements', 'notices', 'identification', 'correspondence', 'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  advocate_id uuid not null references auth.users (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  client_id uuid references public.clients (id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_size bigint,
  mime_type text,
  category public.document_category not null default 'other',
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index documents_advocate_id_idx on public.documents (advocate_id, is_archived);
create index documents_case_id_idx on public.documents (case_id);
create index documents_client_id_idx on public.documents (client_id);

alter table public.documents enable row level security;

create policy "advocate can read own document metadata"
  on public.documents for select
  using ((select auth.uid()) = advocate_id);

create policy "advocate can insert own document metadata"
  on public.documents for insert
  with check (
    (select auth.uid()) = advocate_id
    and (case_id is null or exists (select 1 from public.cases where cases.id = case_id and cases.advocate_id = (select auth.uid())))
    and (client_id is null or exists (select 1 from public.clients where clients.id = client_id and clients.advocate_id = (select auth.uid())))
  );

create policy "advocate can update own document metadata"
  on public.documents for update
  using ((select auth.uid()) = advocate_id)
  with check ((select auth.uid()) = advocate_id);

create policy "advocate can delete own document metadata"
  on public.documents for delete
  using ((select auth.uid()) = advocate_id);
