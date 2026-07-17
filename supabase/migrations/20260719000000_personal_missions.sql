create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  duration_days integer not null check (duration_days between 1 and 365),
  started_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  ends_on date generated always as (started_on + duration_days - 1) stored,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists missions_one_active_per_user_idx
on public.missions (user_id)
where active;

alter table public.missions enable row level security;

create policy "Members can view their missions"
on public.missions for select to authenticated
using ((select auth.uid()) = user_id);

alter table public.posts
add column if not exists mission_id uuid references public.missions(id) on delete set null;

create index if not exists posts_mission_id_created_at_idx
on public.posts (mission_id, created_at desc);

alter table public.notifications
add column if not exists mission_id uuid references public.missions(id) on delete cascade,
add column if not exists mission_title text;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('reaction', 'comment', 'streak_reminder', 'mission_reminder'));

create unique index if not exists notifications_daily_mission_reminder_idx
on public.notifications (recipient_id, mission_id, reminder_date)
where type = 'mission_reminder';

create or replace function public.set_my_mission(mission_title text, mission_duration integer)
returns public.missions
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  created_mission public.missions;
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

  update public.missions
  set active = false
  where user_id = member_id and active;

  delete from public.notifications
  where recipient_id = member_id
    and type in ('streak_reminder', 'mission_reminder')
    and reminder_date = (now() at time zone 'Asia/Seoul')::date
    and read_at is null;

  insert into public.missions (user_id, title, duration_days)
  values (member_id, mission_title, mission_duration)
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
begin
  select mission.id into new.mission_id
  from public.missions as mission
  where mission.user_id = new.user_id
    and mission.active
    and (now() at time zone 'Asia/Seoul')::date between mission.started_on and mission.ends_on
  order by mission.created_at desc
  limit 1;
  return new;
end;
$$;

drop trigger if exists on_post_attach_active_mission on public.posts;
create trigger on_post_attach_active_mission
before insert on public.posts
for each row execute procedure public.attach_active_mission_to_post();

create or replace function public.clear_daily_reminders_after_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
  where recipient_id = new.user_id
    and type in ('streak_reminder', 'mission_reminder')
    and reminder_date = (new.created_at at time zone 'Asia/Seoul')::date
    and read_at is null;
  return new;
end;
$$;

drop trigger if exists on_post_clear_daily_reminders on public.posts;
create trigger on_post_clear_daily_reminders
after insert on public.posts
for each row execute procedure public.clear_daily_reminders_after_post();

create or replace function public.enqueue_daily_streak_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  reminder_day date := (now() at time zone 'Asia/Seoul')::date;
  inserted_count integer := 0;
  mission_count integer := 0;
begin
  insert into public.notifications (recipient_id, type, mission_id, mission_title, reminder_date)
  select mission.user_id, 'mission_reminder', mission.id, mission.title, reminder_day
  from public.missions as mission
  where mission.active
    and reminder_day between mission.started_on and mission.ends_on
    and not exists (
      select 1 from public.posts as post
      where post.user_id = mission.user_id
        and post.mission_id = mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (recipient_id, mission_id, reminder_date)
    where type = 'mission_reminder'
  do nothing;
  get diagnostics mission_count = row_count;

  insert into public.notifications (recipient_id, type, reminder_date)
  select profile.id, 'streak_reminder', reminder_day
  from public.profiles as profile
  where not exists (
      select 1 from public.missions as mission
      where mission.user_id = profile.id
        and mission.active
        and reminder_day between mission.started_on and mission.ends_on
    )
    and not exists (
      select 1 from public.posts as post
      where post.user_id = profile.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (recipient_id, reminder_date)
    where type = 'streak_reminder'
  do nothing;
  get diagnostics inserted_count = row_count;

  return inserted_count + mission_count;
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
  current_mission public.missions;
begin
  if member_id is null or local_now::time < time '20:00' then
    return;
  end if;

  select * into current_mission
  from public.missions as mission
  where mission.user_id = member_id
    and mission.active
    and reminder_day between mission.started_on and mission.ends_on
  order by mission.created_at desc
  limit 1;

  if found then
    if not exists (
      select 1 from public.posts as post
      where post.user_id = member_id
        and post.mission_id = current_mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    ) then
      insert into public.notifications (recipient_id, type, mission_id, mission_title, reminder_date)
      values (member_id, 'mission_reminder', current_mission.id, current_mission.title, reminder_day)
      on conflict (recipient_id, mission_id, reminder_date)
        where type = 'mission_reminder'
      do nothing;
    end if;
  elsif not exists (
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
