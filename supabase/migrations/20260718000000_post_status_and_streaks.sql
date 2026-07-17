alter table public.posts
add column if not exists status text not null default 'working';

alter table public.posts
drop constraint if exists posts_status_check;

alter table public.posts
add constraint posts_status_check
check (status in ('studying', 'working', 'experimenting', 'help', 'completed'));

alter table public.notifications
alter column actor_id drop not null,
alter column post_id drop not null;

alter table public.notifications
add column if not exists reminder_date date;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('reaction', 'comment', 'streak_reminder'));

create unique index if not exists notifications_daily_streak_reminder_idx
on public.notifications (recipient_id, reminder_date)
where type = 'streak_reminder';

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

  if not exists (
    select 1
    from public.posts as post
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

revoke all on function public.enqueue_daily_streak_reminders() from public;
revoke all on function public.ensure_my_daily_streak_reminder() from public;
grant execute on function public.ensure_my_daily_streak_reminder() to authenticated;

do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception
  when insufficient_privilege then
    raise notice 'pg_cron could not be enabled automatically; enable Supabase Cron and schedule public.enqueue_daily_streak_reminders() at 11:00 UTC.';
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'lablog-daily-streak-reminders',
      '0 11 * * *',
      'select public.enqueue_daily_streak_reminders();'
    );
  end if;
exception
  when others then
    raise notice 'Daily reminder cron was not scheduled automatically: %', sqlerrm;
end;
$$;
