-- Multi-lab foundation. Existing data is preserved under the built-in OS Lab.
-- Fixed UUID lets the client remain compatible while this migration is rolled out.
create extension if not exists pgcrypto;

create table if not exists public.labs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '' check (char_length(description) <= 500),
  owner_id uuid references public.profiles(id) on delete set null,
  logo_url text,
  map_image_url text not null default '/lab-tour-room-v5.png',
  default_locale text not null default 'ko' check (default_locale in ('ko', 'vi', 'en')),
  theme_config jsonb not null default '{"accent":"#ffd84d","surface":"#f5f3ee","ink":"#181611"}'::jsonb,
  join_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.labs (id, slug, name, description, owner_id, map_image_url)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  'os-lab',
  'OS Lab',
  'Operating Systems Laboratory',
  (select id from public.profiles order by created_at nulls last, id limit 1),
  '/lab-tour-room-v5.png'
on conflict (id) do update set map_image_url = excluded.map_image_url;

create table if not exists public.lab_members (
  lab_id uuid not null references public.labs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null default 'member'
    check (membership_role in ('owner', 'admin', 'member')),
  seat_index integer check (seat_index between 0 and 99),
  joined_at timestamptz not null default now(),
  primary key (lab_id, user_id),
  unique (lab_id, seat_index)
);

insert into public.lab_members (lab_id, user_id, membership_role, seat_index)
select
  '11111111-1111-4111-8111-111111111111'::uuid,
  profile.id,
  case
    when profile.id = (select owner_id from public.labs where id = '11111111-1111-4111-8111-111111111111'::uuid)
      then 'owner'
    else 'member'
  end,
  profile.lab_seat
from public.profiles as profile
on conflict (lab_id, user_id) do update
set seat_index = coalesce(public.lab_members.seat_index, excluded.seat_index);

create table if not exists public.lab_member_progress (
  lab_id uuid not null references public.labs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  onboarding_completed_at timestamptz,
  chapter_two_completed_at timestamptz,
  chapter_three_completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (lab_id, user_id),
  foreign key (lab_id, user_id)
    references public.lab_members(lab_id, user_id) on delete cascade
);

insert into public.lab_member_progress (
  lab_id, user_id, onboarding_completed_at,
  chapter_two_completed_at, chapter_three_completed_at
)
select
  member.lab_id,
  member.user_id,
  profile.onboarding_completed_at,
  case
    when auth_user.raw_user_meta_data ->> 'labquest_chapter2_completed_at' is not null
      then (auth_user.raw_user_meta_data ->> 'labquest_chapter2_completed_at')::timestamptz
  end,
  case
    when auth_user.raw_user_meta_data ->> 'labquest_chapter3_completed_at' is not null
      then (auth_user.raw_user_meta_data ->> 'labquest_chapter3_completed_at')::timestamptz
  end
from public.lab_members as member
join public.profiles as profile on profile.id = member.user_id
left join auth.users as auth_user on auth_user.id = member.user_id
on conflict (lab_id, user_id) do nothing;

create table if not exists public.lab_rewards (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  name_i18n jsonb not null default '{}'::jsonb,
  description_i18n jsonb not null default '{}'::jsonb,
  reward_type text not null default 'custom'
    check (reward_type in ('points', 'item', 'access', 'custom')),
  points integer not null default 0 check (points between 0 and 1000000),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quest_chapters (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  order_index integer not null check (order_index > 0),
  title_i18n jsonb not null default '{}'::jsonb,
  description_i18n jsonb not null default '{}'::jsonb,
  unlock_rule jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (lab_id, order_index)
);

create table if not exists public.quest_missions (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.quest_chapters(id) on delete cascade,
  order_index integer not null check (order_index > 0),
  mission_type text not null check (
    mission_type in ('code-output', 'code-editor', 'ordering', 'graph', 'quiz', 'paper', 'custom')
  ),
  title_i18n jsonb not null default '{}'::jsonb,
  instructions_i18n jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  reward_id uuid references public.lab_rewards(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chapter_id, order_index)
);

-- Tenant columns. Defaults preserve compatibility with existing RPCs during rollout.
alter table public.posts add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;
alter table public.missions add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;
alter table public.calendar_events add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;
alter table public.online_meetings add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;
alter table public.team_projects add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;
alter table public.notifications add column if not exists lab_id uuid
  references public.labs(id) on delete cascade
  default '11111111-1111-4111-8111-111111111111'::uuid;

update public.posts set lab_id = '11111111-1111-4111-8111-111111111111' where lab_id is null;
update public.missions set lab_id = '11111111-1111-4111-8111-111111111111' where lab_id is null;
update public.calendar_events set lab_id = '11111111-1111-4111-8111-111111111111' where lab_id is null;
update public.online_meetings set lab_id = '11111111-1111-4111-8111-111111111111' where lab_id is null;
update public.team_projects set lab_id = '11111111-1111-4111-8111-111111111111' where lab_id is null;
update public.notifications as notification
set lab_id = coalesce(
  (select post.lab_id from public.posts as post where post.id = notification.post_id),
  (select mission.lab_id from public.missions as mission where mission.id = notification.mission_id),
  (select project.lab_id from public.team_projects as project where project.id = notification.project_id),
  '11111111-1111-4111-8111-111111111111'::uuid
)
where lab_id is null;

alter table public.posts alter column lab_id set not null;
alter table public.missions alter column lab_id set not null;
alter table public.calendar_events alter column lab_id set not null;
alter table public.online_meetings alter column lab_id set not null;
alter table public.team_projects alter column lab_id set not null;
alter table public.notifications alter column lab_id set not null;

create index if not exists posts_lab_created_idx on public.posts(lab_id, created_at desc);
create index if not exists missions_lab_user_idx on public.missions(lab_id, user_id, active);
create index if not exists calendar_events_lab_dates_idx on public.calendar_events(lab_id, starts_on, ends_on);
create index if not exists meetings_lab_project_idx on public.online_meetings(lab_id, project_id, starts_at desc);
create index if not exists projects_lab_created_idx on public.team_projects(lab_id, created_at desc);
create index if not exists notifications_lab_recipient_idx on public.notifications(lab_id, recipient_id, created_at desc);

create or replace function public.is_lab_member(target_lab_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lab_members
    where lab_id = target_lab_id and user_id = target_user_id
  );
$$;

create or replace function public.is_lab_admin(target_lab_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.lab_members
    where lab_id = target_lab_id and user_id = target_user_id
      and membership_role in ('owner', 'admin')
  );
$$;

create or replace function public.shares_lab_with(target_user_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.lab_members as mine
    join public.lab_members as theirs on theirs.lab_id = mine.lab_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = target_user_id
  );
$$;

revoke all on function public.is_lab_member(uuid, uuid) from public;
revoke all on function public.is_lab_admin(uuid, uuid) from public;
revoke all on function public.shares_lab_with(uuid) from public;
grant execute on function public.is_lab_member(uuid, uuid) to authenticated;
grant execute on function public.is_lab_admin(uuid, uuid) to authenticated;
grant execute on function public.shares_lab_with(uuid) to authenticated;

alter table public.labs enable row level security;
alter table public.lab_members enable row level security;
alter table public.lab_member_progress enable row level security;
alter table public.lab_rewards enable row level security;
alter table public.quest_chapters enable row level security;
alter table public.quest_missions enable row level security;

create policy "Members can view their labs" on public.labs for select to authenticated
using (public.is_lab_member(id));
create policy "Owners can update labs" on public.labs for update to authenticated
using (public.is_lab_admin(id)) with check (public.is_lab_admin(id));
create policy "Members can view lab memberships" on public.lab_members for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Admins can manage lab memberships" on public.lab_members for all to authenticated
using (public.is_lab_admin(lab_id)) with check (public.is_lab_admin(lab_id));
create policy "Members can view their progress" on public.lab_member_progress for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Members can update their progress" on public.lab_member_progress for update to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id))
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can create their progress" on public.lab_member_progress for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can view rewards" on public.lab_rewards for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Admins can manage rewards" on public.lab_rewards for all to authenticated
using (public.is_lab_admin(lab_id)) with check (public.is_lab_admin(lab_id));
create policy "Members can view chapters" on public.quest_chapters for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Admins can manage chapters" on public.quest_chapters for all to authenticated
using (public.is_lab_admin(lab_id)) with check (public.is_lab_admin(lab_id));
create policy "Members can view missions" on public.quest_missions for select to authenticated
using (exists (
  select 1 from public.quest_chapters as chapter
  where chapter.id = chapter_id and public.is_lab_member(chapter.lab_id)
));
create policy "Admins can manage quest missions" on public.quest_missions for all to authenticated
using (exists (
  select 1 from public.quest_chapters as chapter
  where chapter.id = chapter_id and public.is_lab_admin(chapter.lab_id)
))
with check (exists (
  select 1 from public.quest_chapters as chapter
  where chapter.id = chapter_id and public.is_lab_admin(chapter.lab_id)
));

-- Replace permissive single-lab policies with tenant-aware policies.
do $$
declare policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(array[
        'profiles', 'posts', 'post_reactions', 'post_comments', 'notifications',
        'missions', 'mission_participants', 'calendar_events', 'online_meetings',
        'team_projects', 'team_project_members', 'team_project_tasks',
        'team_project_point_awards'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

create policy "Lab members can view profiles" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.shares_lab_with(id));
create policy "Members can update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "Lab members can view posts" on public.posts for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Members can create posts in their lab" on public.posts for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can update own lab posts" on public.posts for update to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id))
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can delete own lab posts" on public.posts for delete to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id));

create policy "Lab members can view reactions" on public.post_reactions for select to authenticated
using (exists (select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)));
create policy "Members can manage own reactions" on public.post_reactions for all to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)
))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)
));
create policy "Lab members can view comments" on public.post_comments for select to authenticated
using (exists (select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)));
create policy "Members can manage own comments" on public.post_comments for all to authenticated
using (user_id = (select auth.uid()) and exists (
  select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)
))
with check (user_id = (select auth.uid()) and exists (
  select 1 from public.posts where id = post_id and public.is_lab_member(lab_id)
));

create policy "Members can view own lab notifications" on public.notifications for select to authenticated
using (recipient_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can update own lab notifications" on public.notifications for update to authenticated
using (recipient_id = (select auth.uid()) and public.is_lab_member(lab_id))
with check (recipient_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can delete own lab notifications" on public.notifications for delete to authenticated
using (recipient_id = (select auth.uid()) and public.is_lab_member(lab_id));

create policy "Members can view own lab missions" on public.missions for select to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can view mission participation" on public.mission_participants for select to authenticated
using (exists (
  select 1 from public.missions where id = mission_id and public.is_lab_member(lab_id)
));

create policy "Lab members can view calendar" on public.calendar_events for select to authenticated
using (public.is_lab_member(lab_id));
create policy "Members can create lab calendar events" on public.calendar_events for insert to authenticated
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can update own lab calendar events" on public.calendar_events for update to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id))
with check (user_id = (select auth.uid()) and public.is_lab_member(lab_id));
create policy "Members can delete own lab calendar events" on public.calendar_events for delete to authenticated
using (user_id = (select auth.uid()) and public.is_lab_member(lab_id));

create policy "Lab members can view projects" on public.team_projects for select to authenticated
using (public.is_lab_member(lab_id) and public.can_view_team_project(id));
create policy "Lab members can view project memberships" on public.team_project_members for select to authenticated
using (exists (
  select 1 from public.team_projects where id = project_id
    and public.is_lab_member(lab_id) and public.can_view_team_project(id)
));
create policy "Lab members can view project tasks" on public.team_project_tasks for select to authenticated
using (exists (
  select 1 from public.team_projects where id = project_id
    and public.is_lab_member(lab_id) and public.can_view_team_project(id)
));
create policy "Members can view lab project awards" on public.team_project_point_awards for select to authenticated
using (user_id = (select auth.uid()) or exists (
  select 1 from public.team_projects where id = project_id
    and public.is_lab_member(lab_id) and public.can_view_team_project(id)
));
create policy "Lab members can view meetings" on public.online_meetings for select to authenticated
using (public.is_lab_member(lab_id) and (
  project_id is null or public.can_view_team_project(project_id)
));

-- Legacy trigger/RPC code does not know about lab_id. These guards derive it
-- from the referenced tenant object before RLS sees the new row.
create or replace function public.assign_notification_lab_id()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.lab_id := coalesce(
    (select post.lab_id from public.posts as post where post.id = new.post_id),
    (select mission.lab_id from public.missions as mission where mission.id = new.mission_id),
    (select project.lab_id from public.team_projects as project where project.id = new.project_id),
    new.lab_id,
    '11111111-1111-4111-8111-111111111111'::uuid
  );
  return new;
end;
$$;

drop trigger if exists assign_notification_lab_id_before_write on public.notifications;
create trigger assign_notification_lab_id_before_write
before insert or update of post_id, mission_id, project_id on public.notifications
for each row execute function public.assign_notification_lab_id();

create or replace function public.assign_meeting_lab_id()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.lab_id := coalesce(
    (select project.lab_id from public.team_projects as project where project.id = new.project_id),
    new.lab_id,
    '11111111-1111-4111-8111-111111111111'::uuid
  );
  return new;
end;
$$;

drop trigger if exists assign_meeting_lab_id_before_write on public.online_meetings;
create trigger assign_meeting_lab_id_before_write
before insert or update of project_id on public.online_meetings
for each row execute function public.assign_meeting_lab_id();

create or replace function public.create_lab(
  lab_name text,
  lab_slug text,
  lab_description text default '',
  lab_default_locale text default 'ko'
)
returns public.labs
language plpgsql security definer set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  created_lab public.labs;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  lab_slug := lower(btrim(lab_slug));
  if lab_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Slug must contain lowercase letters, numbers, and hyphens only';
  end if;
  if lab_default_locale not in ('ko', 'vi', 'en') then lab_default_locale := 'ko'; end if;

  insert into public.labs (name, slug, description, owner_id, default_locale)
  values (btrim(lab_name), lab_slug, left(coalesce(lab_description, ''), 500), member_id, lab_default_locale)
  returning * into created_lab;

  insert into public.lab_members (lab_id, user_id, membership_role)
  values (created_lab.id, member_id, 'owner');
  insert into public.lab_member_progress (lab_id, user_id)
  values (created_lab.id, member_id);
  return created_lab;
end;
$$;

create or replace function public.join_lab_by_code(target_join_code text)
returns public.labs
language plpgsql security definer set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  target_lab public.labs;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  select * into target_lab from public.labs
  where join_code = upper(btrim(target_join_code));
  if not found then raise exception 'Invalid lab join code'; end if;

  insert into public.lab_members (lab_id, user_id, membership_role)
  values (target_lab.id, member_id, 'member')
  on conflict (lab_id, user_id) do nothing;
  insert into public.lab_member_progress (lab_id, user_id)
  values (target_lab.id, member_id)
  on conflict (lab_id, user_id) do nothing;
  return target_lab;
end;
$$;

create or replace function public.set_my_lab_seat(target_lab_id uuid, target_seat_index integer)
returns void
language plpgsql security definer set search_path = ''
as $$
declare member_id uuid := (select auth.uid());
begin
  if target_seat_index not between 0 and 99 then raise exception 'Invalid lab seat'; end if;
  if not public.is_lab_member(target_lab_id, member_id) then raise exception 'Not a lab member'; end if;
  update public.lab_members
  set seat_index = target_seat_index
  where lab_id = target_lab_id and user_id = member_id;
end;
$$;

-- Overloads used by the multi-lab client. Original RPC signatures stay valid for OS Lab.
create or replace function public.set_my_mission(
  mission_title text, mission_duration integer, target_lab_id uuid
)
returns public.missions
language plpgsql security definer set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  created_mission public.missions;
  started_on_value date := (now() at time zone 'Asia/Seoul')::date;
  points_value integer;
begin
  if not public.is_lab_member(target_lab_id, member_id) then raise exception 'Not a lab member'; end if;
  if mission_duration < 1 or mission_duration > 365 then raise exception 'Invalid mission duration'; end if;
  points_value := case when mission_duration <= 7 then 10 when mission_duration <= 30 then 5 else 2 end;
  insert into public.missions (
    user_id, title, duration_days, active, started_on, ends_on, points_per_update, lab_id
  ) values (
    member_id, btrim(mission_title), mission_duration, true, started_on_value,
    started_on_value + mission_duration - 1, points_value, target_lab_id
  ) returning * into created_mission;
  return created_mission;
end;
$$;

create or replace function public.create_team_project(
  project_name text, project_description text, project_deadline date,
  project_reward_points integer, invited_user_ids uuid[], target_lab_id uuid
)
returns public.team_projects
language plpgsql security definer set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  created_project public.team_projects;
begin
  if not public.is_lab_member(target_lab_id, host_id) then raise exception 'Not a lab member'; end if;
  if project_deadline < (now() at time zone 'Asia/Seoul')::date then raise exception 'Deadline cannot be in the past'; end if;
  if project_reward_points not between 1 and 500 then raise exception 'Invalid reward points'; end if;
  insert into public.team_projects (owner_id, name, description, deadline, reward_points, lab_id)
  values (host_id, btrim(project_name), left(coalesce(project_description, ''), 500), project_deadline, project_reward_points, target_lab_id)
  returning * into created_project;
  insert into public.team_project_members (project_id, user_id, invited_by, role, status, responded_at)
  values (created_project.id, host_id, host_id, 'host', 'accepted', now());
  insert into public.team_project_members (project_id, user_id, invited_by, role, status)
  select created_project.id, member.user_id, host_id, 'member', 'invited'
  from public.lab_members as member
  where member.lab_id = target_lab_id
    and member.user_id = any(coalesce(invited_user_ids, array[]::uuid[]))
    and member.user_id <> host_id
  on conflict (project_id, user_id) do nothing;
  insert into public.notifications (recipient_id, actor_id, type, project_id, project_title, lab_id)
  select member.user_id, host_id, 'team_project_invite', created_project.id, created_project.name, target_lab_id
  from public.lab_members as member
  where member.lab_id = target_lab_id
    and member.user_id = any(coalesce(invited_user_ids, array[]::uuid[]))
    and member.user_id <> host_id
  on conflict (recipient_id, project_id) where type = 'team_project_invite' do nothing;
  return created_project;
end;
$$;

create or replace function public.get_team_project_reward_total(
  target_user_id uuid, target_lab_id uuid
)
returns integer
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(award.points), 0)::integer
  from public.team_project_point_awards as award
  join public.team_projects as project on project.id = award.project_id
  where award.user_id = target_user_id
    and project.lab_id = target_lab_id
    and public.is_lab_member(target_lab_id)
    and public.is_lab_member(target_lab_id, target_user_id);
$$;

-- New accounts continue joining OS Lab by default until invitation-first signup is enabled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role, initials, avatar_background)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Lab member'),
    coalesce(new.raw_user_meta_data ->> 'initials', upper(left(new.email, 2))),
    coalesce(new.raw_user_meta_data ->> 'avatar_background', 'linear-gradient(135deg, #ffd84d, #ff8a4c)')
  );
  insert into public.lab_members (lab_id, user_id, membership_role)
  values ('11111111-1111-4111-8111-111111111111'::uuid, new.id, 'member')
  on conflict do nothing;
  insert into public.lab_member_progress (lab_id, user_id)
  values ('11111111-1111-4111-8111-111111111111'::uuid, new.id)
  on conflict do nothing;
  return new;
end;
$$;

revoke all on function public.create_lab(text, text, text, text) from public;
revoke all on function public.join_lab_by_code(text) from public;
revoke all on function public.set_my_mission(text, integer, uuid) from public;
revoke all on function public.create_team_project(text, text, date, integer, uuid[], uuid) from public;
revoke all on function public.get_team_project_reward_total(uuid) from public;
revoke all on function public.get_team_project_reward_total(uuid, uuid) from public;
revoke all on function public.set_my_lab_seat(uuid, integer) from public;
grant execute on function public.create_lab(text, text, text, text) to authenticated;
grant execute on function public.join_lab_by_code(text) to authenticated;
grant execute on function public.set_my_mission(text, integer, uuid) to authenticated;
grant execute on function public.create_team_project(text, text, date, integer, uuid[], uuid) to authenticated;
grant execute on function public.get_team_project_reward_total(uuid, uuid) to authenticated;
grant execute on function public.set_my_lab_seat(uuid, integer) to authenticated;
grant select on public.labs, public.lab_members, public.lab_member_progress,
  public.lab_rewards, public.quest_chapters, public.quest_missions to authenticated;
grant insert, update on public.lab_member_progress to authenticated;
grant insert, update, delete on public.lab_rewards, public.quest_chapters,
  public.quest_missions to authenticated;
