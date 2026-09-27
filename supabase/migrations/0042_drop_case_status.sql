-- Case status (draft/active/pending/adjourned/disposed/closed/archived) was
-- never exposed on any screen for the user to set — the app already tracks
-- a case's court via the `court` column, which the UI uses instead.
drop index if exists public.cases_advocate_id_idx;
create index cases_advocate_id_idx on public.cases (advocate_id, is_archived);

alter table public.cases drop column status;
drop type public.case_status;
