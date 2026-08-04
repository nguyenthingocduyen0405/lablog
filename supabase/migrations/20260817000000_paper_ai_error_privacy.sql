-- Detailed provider failures are operational data for the worker logs. Lab
-- members only need the public job state and must not read error_message.

revoke select on public.paper_question_jobs from authenticated;
grant select (
  id,
  paper_id,
  requested_by,
  status,
  attempt_count,
  worker_id,
  model,
  created_at,
  started_at,
  completed_at,
  updated_at
) on public.paper_question_jobs to authenticated;
