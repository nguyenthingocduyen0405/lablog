-- Keep personal missions personal; collaboration now belongs to Team Projects.

delete from public.notifications
where type = 'mission_invite';

drop index if exists public.notifications_mission_invite_unique_idx;
drop function if exists public.invite_members_to_mission(uuid, uuid[]);
drop function if exists public.respond_to_mission_invite(uuid, text);

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

drop policy if exists "Mission members can view missions" on public.missions;
drop policy if exists "Members can view their missions" on public.missions;
create policy "Members can view their missions"
on public.missions for select to authenticated
using ((select auth.uid()) = user_id);

drop table if exists public.mission_participants;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('reaction', 'comment', 'streak_reminder', 'mission_reminder', 'team_project_invite'));
