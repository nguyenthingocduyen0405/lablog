-- Allow several concurrent missions, keep running missions immutable, and make
-- every mission post explicit.

drop index if exists public.missions_one_active_per_user_idx;

alter table public.missions
drop constraint if exists missions_points_per_update_check;

update public.missions
set points_per_update = case
  when duration_days <= 7 then 2
  when duration_days <= 14 then 3
  when duration_days <= 30 then 5
  else least(10, 5 + ceil((duration_days - 30) / 30.0)::integer)
end;

alter table public.missions
add constraint missions_points_per_update_check
check (points_per_update between 1 and 10);

alter table public.posts
add column if not exists mission_title text;

update public.posts as post
set mission_title = mission.title
from public.missions as mission
where post.mission_id = mission.id
  and post.mission_title is null;

create or replace function public.set_my_mission(mission_title text, mission_duration integer)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  created_mission public.missions;
  daily_points integer;
begin
  if member_id is null then
    raise exception 'Authentication required';
  end if;

  mission_title := btrim(mission_title);
  if char_length(mission_title) not between 1 and 120 then
    raise exception 'Mission title must be between 1 and 120 characters';
  end if;
  if mission_duration not between 1 and 365 then
    raise exception 'Mission duration must be between 1 and 365 days';
  end if;

  if mission_duration <= 7 then
    daily_points := 2;
  elsif mission_duration <= 14 then
    daily_points := 3;
  elsif mission_duration <= 30 then
    daily_points := 5;
  else
    daily_points := least(10, 5 + ceil((mission_duration - 30) / 30.0)::integer);
  end if;

  if exists (
    select 1 from public.missions as mission
    where mission.user_id = member_id
      and mission.active
      and (now() at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on
      and lower(mission.title) = lower(mission_title)
  ) then
    raise exception 'This mission is already running';
  end if;

  insert into public.missions (user_id, title, duration_days, points_per_update, active)
  values (member_id, mission_title, mission_duration, daily_points, true)
  returning * into created_mission;

  return created_mission;
end;
$$;

create or replace function public.attach_active_mission_to_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  chosen_mission public.missions;
begin
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

revoke all on function public.set_my_mission(text, integer) from public;
grant execute on function public.set_my_mission(text, integer) to authenticated;
