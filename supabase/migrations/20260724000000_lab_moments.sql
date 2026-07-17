-- Separate mission-based work updates from social Lab Moments.

alter table public.posts
add column if not exists post_kind text not null default 'work';

alter table public.posts
drop constraint if exists posts_post_kind_check;

alter table public.posts
add constraint posts_post_kind_check
check (post_kind in ('work', 'moment'));

alter table public.posts
add column if not exists moment_category text;

alter table public.posts
drop constraint if exists posts_moment_category_check;

alter table public.posts
add constraint posts_moment_category_check
check (moment_category is null or moment_category in ('daily', 'travel', 'food', 'rest', 'event'));

create index if not exists posts_post_kind_created_at_idx
on public.posts (post_kind, created_at desc);

create or replace function public.attach_active_mission_to_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_mission public.missions;
begin
  if new.post_kind = 'moment' then
    new.moment_category := coalesce(new.moment_category, 'daily');
    new.mission_id := null;
    new.mission_title := null;
    new.score_awarded := 0;
    return new;
  end if;

  new.moment_category := null;

  if new.mission_id is not null then
    select * into chosen_mission
    from public.missions as mission
    where mission.id = new.mission_id
      and mission.user_id = new.user_id
      and mission.active
      and (new.created_at at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on;

    if not found then
      raise exception 'Choose one of your active missions';
    end if;

    new.mission_title := chosen_mission.title;
    if exists (
      select 1 from public.posts as post
      where post.user_id = new.user_id
        and post.post_kind = 'work'
        and post.mission_id = chosen_mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
    ) then
      new.score_awarded := 0;
    else
      new.score_awarded := chosen_mission.points_per_update;
    end if;
  elsif exists (
    select 1 from public.missions as mission
    where mission.user_id = new.user_id
      and mission.active
      and (new.created_at at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on
  ) then
    raise exception 'Mission selection is required';
  else
    new.mission_title := null;
    if exists (
      select 1 from public.posts as post
      where post.user_id = new.user_id
        and post.post_kind = 'work'
        and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
    ) then
      new.score_awarded := 0;
    else
      new.score_awarded := 1;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.clear_daily_reminders_after_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.post_kind = 'moment' then
    return new;
  end if;

  delete from public.notifications
  where recipient_id = new.user_id
    and reminder_date = (new.created_at at time zone 'Asia/Seoul')::date
    and read_at is null
    and (
      type = 'streak_reminder'
      or (type = 'mission_reminder' and mission_id = new.mission_id)
    );
  return new;
end;
$$;

create or replace function public.enqueue_daily_streak_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_day date := (now() at time zone 'Asia/Seoul')::date;
  inserted_count integer;
begin
  insert into public.notifications (recipient_id, type, reminder_date)
  select profile.id, 'streak_reminder', reminder_day
  from public.profiles as profile
  where not exists (
    select 1
    from public.posts as post
    where post.user_id = profile.id
      and post.post_kind = 'work'
      and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
  )
  on conflict (recipient_id, reminder_date)
    where type = 'streak_reminder'
  do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create or replace function public.ensure_my_daily_streak_reminder()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  local_now timestamp := now() at time zone 'Asia/Seoul';
  reminder_day date := local_now::date;
begin
  if member_id is null or local_now::time < time '20:00' then
    return;
  end if;

  insert into public.notifications (recipient_id, type, mission_id, mission_title, reminder_date)
  select member_id, 'mission_reminder', mission.id, mission.title, reminder_day
  from public.missions as mission
  where mission.user_id = member_id
    and mission.active
    and reminder_day between mission.started_on and mission.ends_on
    and not exists (
      select 1 from public.posts as post
      where post.user_id = member_id
        and post.post_kind = 'work'
        and post.mission_id = mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (recipient_id, mission_id, reminder_date)
    where type = 'mission_reminder'
  do nothing;

  if not exists (
    select 1 from public.missions as mission
    where mission.user_id = member_id
      and mission.active
      and reminder_day between mission.started_on and mission.ends_on
  ) and not exists (
    select 1 from public.posts as post
    where post.user_id = member_id
      and post.post_kind = 'work'
      and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
  ) then
    insert into public.notifications (recipient_id, type, reminder_date)
    values (member_id, 'streak_reminder', reminder_day)
    on conflict (recipient_id, reminder_date)
      where type = 'streak_reminder'
    do nothing;
  end if;
end;
$$;
