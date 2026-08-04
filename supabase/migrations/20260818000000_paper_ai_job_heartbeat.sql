-- Keep long local Ollama generations owned by the worker that is actively
-- processing them. A request is bounded to 25 minutes, so a 45-minute missed
-- heartbeat leaves cleanup margin while still recovering crashed workers.

create or replace function public.heartbeat_paper_question_job(
  target_job_id uuid,
  worker_name text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if char_length(trim(coalesce(worker_name, ''))) not between 1 and 200 then
    raise exception 'Valid worker name required';
  end if;

  update public.paper_question_jobs as job
  set updated_at = now()
  where job.id = target_job_id
    and job.status = 'processing'
    and job.worker_id = trim(worker_name);

  return found;
end;
$$;

create or replace function public.claim_paper_question_job(worker_name text)
returns table (
  job_id uuid,
  paper_id uuid,
  paper_title text,
  paper_url text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if char_length(trim(coalesce(worker_name, ''))) not between 1 and 200 then
    raise exception 'Valid worker name required';
  end if;

  update public.paper_question_jobs as exhausted
  set
    status = 'failed',
    worker_id = null,
    error_message = 'Generation stopped after the maximum number of attempts.',
    completed_at = now()
  where exhausted.status = 'processing'
    and exhausted.updated_at < now() - interval '45 minutes'
    and exhausted.attempt_count >= 10;

  update public.paper_question_jobs as stale
  set
    status = 'queued',
    worker_id = null,
    started_at = null,
    error_message = 'Recovered after worker timeout.'
  where stale.status = 'processing'
    and stale.updated_at < now() - interval '45 minutes'
    and stale.attempt_count < 10;

  update public.paper_question_jobs as exhausted
  set
    status = 'failed',
    worker_id = null,
    error_message = 'Generation stopped after the maximum number of attempts.',
    completed_at = now()
  where exhausted.status = 'queued' and exhausted.attempt_count >= 10;

  select queued.id into claimed_id
  from public.paper_question_jobs as queued
  where queued.status = 'queued' and queued.attempt_count < 10
  order by queued.created_at
  for update skip locked
  limit 1;

  if claimed_id is null then
    return;
  end if;

  update public.paper_question_jobs as claimed
  set
    status = 'processing',
    worker_id = trim(worker_name),
    attempt_count = claimed.attempt_count + 1,
    started_at = now(),
    completed_at = null,
    error_message = null
  where claimed.id = claimed_id;

  return query
  select
    job.id,
    paper.id,
    paper.title,
    paper.paper_url,
    job.attempt_count
  from public.paper_question_jobs as job
  join public.lab_papers as paper on paper.id = job.paper_id
  where job.id = claimed_id;
end;
$$;

revoke all on function public.heartbeat_paper_question_job(uuid, text)
  from public;
revoke all on function public.claim_paper_question_job(text) from public;
grant execute on function public.heartbeat_paper_question_job(uuid, text)
  to service_role;
grant execute on function public.claim_paper_question_job(text)
  to service_role;
