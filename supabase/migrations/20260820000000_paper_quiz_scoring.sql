-- Paper quiz scoring: 50-point maximum, one full-value attempt, one 80%
-- improvement attempt, then unlimited practice. 35 points completes a paper.

create table if not exists public.paper_quiz_scores (
  paper_id uuid not null references public.lab_papers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  first_score integer not null default 0 check (first_score between 0 and 50),
  second_score integer check (second_score between 0 and 50),
  awarded_score integer not null default 0 check (awarded_score between 0 and 50),
  best_correct_count integer not null default 0 check (best_correct_count between 0 and 20),
  last_correct_count integer not null default 0 check (last_correct_count between 0 and 20),
  last_question_count integer not null default 10 check (last_question_count between 1 and 20),
  last_question_set_job_id uuid references public.paper_question_jobs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (paper_id, user_id)
);

create index if not exists paper_quiz_scores_user_idx
  on public.paper_quiz_scores(user_id);

drop trigger if exists paper_quiz_scores_touch_updated_at on public.paper_quiz_scores;
create trigger paper_quiz_scores_touch_updated_at
before update on public.paper_quiz_scores
for each row execute function public.touch_updated_at();

alter table public.paper_quiz_scores enable row level security;
drop policy if exists "Lab members can view paper quiz scores" on public.paper_quiz_scores;
create policy "Lab members can view paper quiz scores"
  on public.paper_quiz_scores for select to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

create or replace function public.submit_paper_quiz(
  target_paper_id uuid,
  submitted_answers jsonb
)
returns table (
  attempt_number integer,
  correct_count integer,
  question_count integer,
  raw_score integer,
  awarded_score integer,
  score_changed boolean,
  is_completed boolean,
  is_scored_attempt boolean
)
language plpgsql security definer set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  target_lab_id uuid;
  question_payload jsonb;
  question_set_job_id uuid;
  total_questions integer;
  total_correct integer;
  calculated_score integer;
  discounted_score integer;
  prior_attempts integer;
  prior_awarded integer;
  next_awarded integer;
  inserted_rows integer;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  if coalesce(pg_catalog.jsonb_typeof(submitted_answers), 'null') <> 'array' then
    raise exception 'Answers must be an array';
  end if;

  select paper.lab_id, question_set.payload, question_set.generated_by_job_id
  into target_lab_id, question_payload, question_set_job_id
  from public.lab_papers as paper
  join public.paper_question_sets as question_set
    on question_set.paper_id = paper.id
  where paper.id = target_paper_id;

  if target_lab_id is null or not public.is_lab_member(target_lab_id) then
    raise exception 'Paper quiz is unavailable';
  end if;

  total_questions := pg_catalog.jsonb_array_length(question_payload -> 'questions');
  if total_questions not between 1 and 20
    or pg_catalog.jsonb_array_length(submitted_answers) <> total_questions
  then
    raise exception 'Answer every quiz question';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(
      question_payload -> 'questions'
    ) with ordinality as question(value, position)
    where pg_catalog.jsonb_typeof(
      submitted_answers -> ((question.position - 1)::integer)
    ) <> 'number'
      or (submitted_answers ->> ((question.position - 1)::integer)) !~ '^[0-9]+$'
      or (submitted_answers ->> ((question.position - 1)::integer))::integer < 0
      or (submitted_answers ->> ((question.position - 1)::integer))::integer
        >= pg_catalog.jsonb_array_length(question.value -> 'options')
  ) then
    raise exception 'Invalid quiz answer';
  end if;

  select count(*)::integer
  into total_correct
  from pg_catalog.jsonb_array_elements(
    question_payload -> 'questions'
  ) with ordinality as question(value, position)
  where (submitted_answers ->> ((question.position - 1)::integer))::integer
    = (question.value ->> 'answer_index')::integer;

  calculated_score := pg_catalog.round(
    total_correct * 50.0 / total_questions
  )::integer;

  insert into public.paper_quiz_scores (
    paper_id, user_id, attempt_count, first_score, awarded_score,
    best_correct_count, last_correct_count, last_question_count,
    last_question_set_job_id
  ) values (
    target_paper_id, member_id, 1, calculated_score, calculated_score,
    total_correct, total_correct, total_questions, question_set_job_id
  )
  on conflict (paper_id, user_id) do nothing;
  get diagnostics inserted_rows = row_count;

  if inserted_rows = 1 then
    prior_attempts := 0;
    prior_awarded := 0;
    next_awarded := calculated_score;
  else
    select score.attempt_count, score.awarded_score
    into prior_attempts, prior_awarded
    from public.paper_quiz_scores as score
    where score.paper_id = target_paper_id and score.user_id = member_id
    for update;

    if prior_attempts = 1 then
      discounted_score := pg_catalog.round(calculated_score * 0.8)::integer;
      next_awarded := greatest(prior_awarded, discounted_score);
    else
      next_awarded := prior_awarded;
    end if;

    update public.paper_quiz_scores as score
    set
      attempt_count = score.attempt_count + 1,
      second_score = case
        when score.attempt_count = 1 then calculated_score
        else score.second_score
      end,
      awarded_score = next_awarded,
      best_correct_count = greatest(
        score.best_correct_count,
        total_correct
      ),
      last_correct_count = total_correct,
      last_question_count = total_questions,
      last_question_set_job_id = question_set_job_id
    where score.paper_id = target_paper_id and score.user_id = member_id;
  end if;

  insert into public.paper_progress (
    paper_id, user_id, status, progress_percent
  ) values (
    target_paper_id,
    member_id,
    case when next_awarded >= 35 then 'completed' else 'reading' end,
    case
      when next_awarded >= 35 then 100
      else least(99, next_awarded * 2)
    end
  )
  on conflict (paper_id, user_id) do update set
    status = case
      when public.paper_progress.status = 'completed' then 'completed'
      else excluded.status
    end,
    progress_percent = case
      when public.paper_progress.status = 'completed' then 100
      else excluded.progress_percent
    end;

  return query select
    prior_attempts + 1, total_correct, total_questions, calculated_score,
    next_awarded, next_awarded > prior_awarded, next_awarded >= 35,
    prior_attempts < 2;
end;
$$;

create or replace function public.get_paper_quiz_reward_total(
  target_user_id uuid,
  target_lab_id uuid
)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(score.awarded_score), 0)::integer
  from public.paper_quiz_scores as score
  join public.lab_papers as paper on paper.id = score.paper_id
  where score.user_id = target_user_id
    and paper.lab_id = target_lab_id
    and public.is_lab_member(target_lab_id)
    and public.is_lab_member(target_lab_id, target_user_id);
$$;

revoke all on table public.paper_quiz_scores from public;
grant select on table public.paper_quiz_scores to authenticated;
revoke all on function public.submit_paper_quiz(uuid, jsonb) from public;
revoke all on function public.get_paper_quiz_reward_total(uuid, uuid) from public;
grant execute on function public.submit_paper_quiz(uuid, jsonb) to authenticated;
grant execute on function public.get_paper_quiz_reward_total(uuid, uuid)
  to authenticated;
