alter table public.profiles
add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;

alter table public.missions
add column if not exists points_per_update integer not null default 10;

update public.missions
set points_per_update = least(50, 5 + ceil(duration_days / 7.0)::integer * 5);

alter table public.missions
drop constraint if exists missions_points_per_update_check;

alter table public.missions
add constraint missions_points_per_update_check
check (points_per_update between 1 and 50);

alter table public.posts
add column if not exists score_awarded integer not null default 1;

alter table public.posts
alter column score_awarded set default 0;

alter table public.posts
drop constraint if exists posts_score_awarded_check;

alter table public.posts
add constraint posts_score_awarded_check
check (score_awarded between 0 and 50);

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

  daily_points := least(50, 5 + ceil(mission_duration / 7.0)::integer * 5);

  update public.missions
  set active = false
  where user_id = member_id and active;

  delete from public.notifications
  where recipient_id = member_id
    and type in ('streak_reminder', 'mission_reminder')
    and reminder_date = (now() at time zone 'Asia/Seoul')::date
    and read_at is null;

  insert into public.missions (user_id, title, duration_days, points_per_update)
  values (member_id, mission_title, mission_duration, daily_points)
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
  mission_points integer;
begin
  select mission.id, mission.points_per_update
  into new.mission_id, mission_points
  from public.missions as mission
  where mission.user_id = new.user_id
    and mission.active
    and (now() at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on
  order by mission.created_at desc
  limit 1;

  if new.mission_id is not null then
    if exists (
      select 1 from public.posts as post
      where post.user_id = new.user_id
        and post.mission_id = new.mission_id
        and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
    ) then
      new.score_awarded := 0;
    else
      new.score_awarded := mission_points;
    end if;
  elsif exists (
    select 1 from public.posts as post
    where post.user_id = new.user_id
      and (post.created_at at time zone 'Asia/Seoul')::date = (new.created_at at time zone 'Asia/Seoul')::date
  ) then
    new.score_awarded := 0;
  else
    new.score_awarded := 1;
  end if;

  return new;
end;
$$;
