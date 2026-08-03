-- A streak warning is only meaningful when yesterday has a work entry and
-- today does not. Restore mission reminders and scope daily reminders by lab.

delete from public.notifications as notification
where notification.type = 'streak_reminder'
  and notification.reminder_date is not null
  and not exists (
    select 1
    from public.posts as post
    where post.lab_id = notification.lab_id
      and post.user_id = notification.recipient_id
      and post.post_kind = 'work'
      and (post.created_at at time zone 'Asia/Seoul')::date
        = notification.reminder_date - 1
  );

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in (
  'reaction',
  'comment',
  'first_record_reminder',
  'streak_reminder',
  'mission_reminder',
  'team_project_invite'
));

drop index if exists public.notifications_daily_streak_reminder_idx;

create unique index notifications_daily_streak_reminder_idx
on public.notifications (lab_id, recipient_id, reminder_date)
where type = 'streak_reminder';

create unique index if not exists notifications_daily_first_record_reminder_idx
on public.notifications (lab_id, recipient_id, reminder_date)
where type = 'first_record_reminder';

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

  delete from public.notifications as notification
  where notification.lab_id = new.lab_id
    and notification.recipient_id = new.user_id
    and notification.reminder_date
      = (new.created_at at time zone 'Asia/Seoul')::date
    and notification.read_at is null
    and (
      notification.type in ('first_record_reminder', 'streak_reminder')
      or (
        notification.type = 'mission_reminder'
        and notification.mission_id = new.mission_id
      )
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
  mission_count integer := 0;
  streak_count integer := 0;
  first_record_count integer := 0;
begin
  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    mission_id,
    mission_title,
    reminder_date
  )
  select
    mission.lab_id,
    mission.user_id,
    'mission_reminder',
    mission.id,
    mission.title,
    reminder_day
  from public.missions as mission
  where mission.active
    and reminder_day between mission.started_on and mission.ends_on
    and exists (
      select 1
      from public.lab_members as membership
      where membership.lab_id = mission.lab_id
        and membership.user_id = mission.user_id
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = mission.lab_id
        and post.user_id = mission.user_id
        and post.post_kind = 'work'
        and post.mission_id = mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (recipient_id, mission_id, reminder_date)
    where type = 'mission_reminder'
  do nothing;

  get diagnostics mission_count = row_count;

  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    reminder_date
  )
  select
    membership.lab_id,
    membership.user_id,
    'streak_reminder',
    reminder_day
  from public.lab_members as membership
  where not exists (
      select 1
      from public.missions as mission
      where mission.lab_id = membership.lab_id
        and mission.user_id = membership.user_id
        and mission.active
        and reminder_day between mission.started_on and mission.ends_on
    )
    and exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = membership.user_id
        and post.post_kind = 'work'
        and (post.created_at at time zone 'Asia/Seoul')::date
          = reminder_day - 1
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = membership.user_id
        and post.post_kind = 'work'
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (lab_id, recipient_id, reminder_date)
    where type = 'streak_reminder'
  do nothing;

  get diagnostics streak_count = row_count;

  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    reminder_date
  )
  select
    membership.lab_id,
    membership.user_id,
    'first_record_reminder',
    reminder_day
  from public.lab_members as membership
  where not exists (
      select 1
      from public.missions as mission
      where mission.lab_id = membership.lab_id
        and mission.user_id = membership.user_id
        and mission.active
        and reminder_day between mission.started_on and mission.ends_on
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = membership.user_id
        and post.post_kind = 'work'
    )
  on conflict (lab_id, recipient_id, reminder_date)
    where type = 'first_record_reminder'
  do nothing;

  get diagnostics first_record_count = row_count;
  return mission_count + streak_count + first_record_count;
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

  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    mission_id,
    mission_title,
    reminder_date
  )
  select
    mission.lab_id,
    member_id,
    'mission_reminder',
    mission.id,
    mission.title,
    reminder_day
  from public.missions as mission
  where mission.user_id = member_id
    and mission.active
    and reminder_day between mission.started_on and mission.ends_on
    and exists (
      select 1
      from public.lab_members as membership
      where membership.lab_id = mission.lab_id
        and membership.user_id = member_id
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = mission.lab_id
        and post.user_id = member_id
        and post.post_kind = 'work'
        and post.mission_id = mission.id
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (recipient_id, mission_id, reminder_date)
    where type = 'mission_reminder'
  do nothing;

  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    reminder_date
  )
  select
    membership.lab_id,
    member_id,
    'streak_reminder',
    reminder_day
  from public.lab_members as membership
  where membership.user_id = member_id
    and not exists (
      select 1
      from public.missions as mission
      where mission.lab_id = membership.lab_id
        and mission.user_id = member_id
        and mission.active
        and reminder_day between mission.started_on and mission.ends_on
    )
    and exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = member_id
        and post.post_kind = 'work'
        and (post.created_at at time zone 'Asia/Seoul')::date
          = reminder_day - 1
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = member_id
        and post.post_kind = 'work'
        and (post.created_at at time zone 'Asia/Seoul')::date = reminder_day
    )
  on conflict (lab_id, recipient_id, reminder_date)
    where type = 'streak_reminder'
  do nothing;

  insert into public.notifications (
    lab_id,
    recipient_id,
    type,
    reminder_date
  )
  select
    membership.lab_id,
    member_id,
    'first_record_reminder',
    reminder_day
  from public.lab_members as membership
  where membership.user_id = member_id
    and not exists (
      select 1
      from public.missions as mission
      where mission.lab_id = membership.lab_id
        and mission.user_id = member_id
        and mission.active
        and reminder_day between mission.started_on and mission.ends_on
    )
    and not exists (
      select 1
      from public.posts as post
      where post.lab_id = membership.lab_id
        and post.user_id = member_id
        and post.post_kind = 'work'
    )
  on conflict (lab_id, recipient_id, reminder_date)
    where type = 'first_record_reminder'
  do nothing;
end;
$$;

revoke all on function public.enqueue_daily_streak_reminders() from public;
revoke all on function public.ensure_my_daily_streak_reminder() from public;
grant execute on function public.ensure_my_daily_streak_reminder()
  to authenticated;
