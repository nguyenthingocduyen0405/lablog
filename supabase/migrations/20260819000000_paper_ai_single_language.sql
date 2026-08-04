-- Generate each paper quiz only in the interface language selected when the
-- admin queues it. Existing jobs default to Korean for backward compatibility.

alter table public.paper_question_jobs
  add column if not exists generation_locale text not null default 'ko'
  check (generation_locale in ('ko', 'vi', 'en'));

drop function if exists public.claim_paper_question_job(text);

create function public.claim_paper_question_job(worker_name text)
returns table (
  job_id uuid,
  paper_id uuid,
  paper_title text,
  paper_url text,
  attempt_count integer,
  generation_locale text
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
    job.attempt_count,
    job.generation_locale
  from public.paper_question_jobs as job
  join public.lab_papers as paper on paper.id = job.paper_id
  where job.id = claimed_id;
end;
$$;

revoke all on function public.claim_paper_question_job(text) from public;
grant execute on function public.claim_paper_question_job(text)
  to service_role;
grant select (generation_locale) on public.paper_question_jobs
  to authenticated;
