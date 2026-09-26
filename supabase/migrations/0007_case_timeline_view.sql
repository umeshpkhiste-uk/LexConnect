-- Case timeline (spec §19): a derived read, not a duplicated log table —
-- avoids the sync-drift bugs that come from maintaining a parallel event
-- log. security_invoker means each underlying table's own RLS still applies
-- per viewer, so this view carries no privilege of its own.

create view public.case_timeline
  with (security_invoker = true) as
select id as case_id, created_at as occurred_at, 'case_created'::text as event_type,
  'Case created'::text as title, null::text as detail
from public.cases

union all

select case_id, hearing_at, case status
    when 'completed' then 'hearing_completed'
    when 'adjourned' then 'hearing_adjourned'
    when 'cancelled' then 'hearing_cancelled'
    else 'hearing_scheduled'
  end,
  coalesce(hearing_type, 'Hearing'),
  coalesce(outcome, purpose)
from public.hearings

union all

select case_id, meeting_at, 'meeting'::text,
  coalesce(replace(meeting_type::text, '_', ' '), 'Meeting'),
  discussion_notes
from public.meetings
where case_id is not null

union all

select case_id, occurred_at, 'communication'::text,
  coalesce(replace(communication_type::text, '_', ' '), 'Communication'),
  summary
from public.communications
where case_id is not null

union all

select case_id, created_at, 'task_created'::text, title, description
from public.tasks
where case_id is not null;

grant select on public.case_timeline to authenticated;
