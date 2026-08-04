-- Queue AI question generation on JCloud and publish one current question set
-- per paper. The worker uses the service role; lab members only see results.

create table if not exists public.paper_question_jobs (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.lab_papers(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 10),
  worker_id text,
  model text,
  error_message text check (char_length(error_message) <= 2000),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_question_sets (
  paper_id uuid primary key references public.lab_papers(id) on delete cascade,
  generated_by_job_id uuid unique references public.paper_question_jobs(id)
    on delete set null,
  model text not null,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object'
    and jsonb_typeof(payload -> 'summary') = 'object'
    and jsonb_typeof(payload -> 'questions') = 'array'
    and jsonb_array_length(payload -> 'questions') between 5 and 20
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists paper_question_jobs_one_active_per_paper_idx
  on public.paper_question_jobs(paper_id)
  where status in ('queued', 'processing');
create index if not exists paper_question_jobs_queue_idx
  on public.paper_question_jobs(created_at)
  where status = 'queued';
create index if not exists paper_question_jobs_paper_created_idx
  on public.paper_question_jobs(paper_id, created_at desc);

drop trigger if exists paper_question_jobs_touch_updated_at
  on public.paper_question_jobs;
create trigger paper_question_jobs_touch_updated_at
before update on public.paper_question_jobs
for each row execute function public.touch_updated_at();

drop trigger if exists paper_question_sets_touch_updated_at
  on public.paper_question_sets;
create trigger paper_question_sets_touch_updated_at
before update on public.paper_question_sets
for each row execute function public.touch_updated_at();

alter table public.paper_question_jobs enable row level security;
alter table public.paper_question_sets enable row level security;

drop policy if exists "Lab members can view paper question jobs"
  on public.paper_question_jobs;
create policy "Lab members can view paper question jobs"
  on public.paper_question_jobs for select to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

drop policy if exists "Lab admins can request paper questions"
  on public.paper_question_jobs;
create policy "Lab admins can request paper questions"
  on public.paper_question_jobs for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'queued'
    and attempt_count = 0
    and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_admin(paper.lab_id)
    )
  );

drop policy if exists "Lab admins can delete paper question jobs"
  on public.paper_question_jobs;
create policy "Lab admins can delete paper question jobs"
  on public.paper_question_jobs for delete to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_admin(paper.lab_id)
    )
  );

drop policy if exists "Lab members can view paper question sets"
  on public.paper_question_sets;
create policy "Lab members can view paper question sets"
  on public.paper_question_sets for select to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

grant select, insert, delete on public.paper_question_jobs to authenticated;
grant select on public.paper_question_sets to authenticated;

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

  update public.paper_question_jobs as stale
  set
    status = 'queued',
    worker_id = null,
    started_at = null,
    error_message = 'Recovered after worker timeout.'
  where stale.status = 'processing'
    and stale.started_at < now() - interval '30 minutes'
    and stale.attempt_count < 10;

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

create or replace function public.complete_paper_question_job(
  target_job_id uuid,
  generated_model text,
  generated_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_paper_id uuid;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;
  if char_length(trim(coalesce(generated_model, ''))) not between 1 and 200 then
    raise exception 'Valid model required';
  end if;
  if jsonb_typeof(generated_payload) <> 'object'
    or jsonb_typeof(generated_payload -> 'summary') <> 'object'
    or jsonb_typeof(generated_payload -> 'questions') <> 'array'
    or jsonb_array_length(generated_payload -> 'questions') not between 5 and 20
  then
    raise exception 'Invalid question payload';
  end if;

  select job.paper_id into target_paper_id
  from public.paper_question_jobs as job
  where job.id = target_job_id and job.status = 'processing'
  for update;
  if target_paper_id is null then
    raise exception 'Processing job not found';
  end if;

  insert into public.paper_question_sets (
    paper_id,
    generated_by_job_id,
    model,
    payload
  ) values (
    target_paper_id,
    target_job_id,
    trim(generated_model),
    generated_payload
  )
  on conflict (paper_id) do update set
    generated_by_job_id = excluded.generated_by_job_id,
    model = excluded.model,
    payload = excluded.payload,
    updated_at = now();

  update public.paper_question_jobs
  set
    status = 'completed',
    model = trim(generated_model),
    completed_at = now(),
    error_message = null
  where id = target_job_id;
end;
$$;

create or replace function public.fail_paper_question_job(
  target_job_id uuid,
  failure_message text,
  attempted_model text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'Service role required';
  end if;

  update public.paper_question_jobs
  set
    status = 'failed',
    model = nullif(trim(coalesce(attempted_model, '')), ''),
    error_message = left(
      coalesce(nullif(trim(coalesce(failure_message, '')), ''), 'AI generation failed.'),
      2000
    ),
    completed_at = now()
  where id = target_job_id and status = 'processing';
end;
$$;

revoke all on function public.claim_paper_question_job(text) from public;
revoke all on function public.complete_paper_question_job(uuid, text, jsonb)
  from public;
revoke all on function public.fail_paper_question_job(uuid, text, text)
  from public;
grant execute on function public.claim_paper_question_job(text)
  to service_role;
grant execute on function public.complete_paper_question_job(uuid, text, jsonb)
  to service_role;
grant execute on function public.fail_paper_question_job(uuid, text, text)
  to service_role;
