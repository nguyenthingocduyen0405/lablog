-- Advanced Quest Studio ordering and a collaborative Paper Club per lab.

create table if not exists public.lab_papers (
  id uuid primary key default gen_random_uuid(),
  lab_id uuid not null references public.labs(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 240),
  authors text not null default '' check (char_length(authors) <= 500),
  abstract text not null default '' check (char_length(abstract) <= 10000),
  paper_url text not null check (
    paper_url ~ '^https?://' and char_length(paper_url) <= 2048
  ),
  published_year integer check (published_year between 1800 and 2200),
  tags text[] not null default '{}'::text[] check (cardinality(tags) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.paper_progress (
  paper_id uuid not null references public.lab_papers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'to-read'
    check (status in ('to-read', 'reading', 'completed')),
  progress_percent integer not null default 0
    check (progress_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (paper_id, user_id),
  check (
    (status = 'to-read' and progress_percent = 0)
    or (status = 'reading' and progress_percent between 0 and 99)
    or (status = 'completed' and progress_percent = 100)
  )
);

create table if not exists public.paper_comments (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.lab_papers(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lab_papers_lab_created_idx
  on public.lab_papers(lab_id, created_at desc);
create index if not exists paper_progress_user_updated_idx
  on public.paper_progress(user_id, updated_at desc);
create index if not exists paper_comments_paper_created_idx
  on public.paper_comments(paper_id, created_at);

alter table public.quest_missions
  add column if not exists paper_id uuid references public.lab_papers(id)
  on delete set null;
create index if not exists quest_missions_paper_idx
  on public.quest_missions(paper_id) where paper_id is not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.protect_lab_paper_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lab_id is distinct from old.lab_id then
    raise exception 'Paper lab cannot be changed';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_quest_paper_link()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  mission_lab_id uuid;
  paper_lab_id uuid;
  linked_paper_title text;
  linked_paper_url text;
begin
  if new.paper_id is null then
    if tg_op = 'UPDATE' and old.paper_id is not null then
      new.content = new.content - 'paperId' - 'paperTitle' - 'paperUrl';
    end if;
    return new;
  end if;
  select chapter.lab_id into mission_lab_id
  from public.quest_chapters as chapter where chapter.id = new.chapter_id;
  select paper.lab_id, paper.title, paper.paper_url
  into paper_lab_id, linked_paper_title, linked_paper_url
  from public.lab_papers as paper where paper.id = new.paper_id;
  if mission_lab_id is null or paper_lab_id is null or mission_lab_id <> paper_lab_id then
    raise exception 'Quest mission and paper must belong to the same lab';
  end if;
  new.content = pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        coalesce(new.content, '{}'::jsonb),
        '{paperId}', pg_catalog.to_jsonb(new.paper_id::text), true
      ),
      '{paperTitle}', pg_catalog.to_jsonb(linked_paper_title), true
    ),
    '{paperUrl}', pg_catalog.to_jsonb(linked_paper_url), true
  );
  return new;
end;
$$;

create or replace function public.protect_quest_chapter_lab()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.lab_id is distinct from old.lab_id then
    raise exception 'Quest chapter lab cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.sync_paper_mission_snapshots()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.quest_missions
  set content = pg_catalog.jsonb_set(
    pg_catalog.jsonb_set(
      pg_catalog.jsonb_set(
        coalesce(content, '{}'::jsonb),
        '{paperId}', pg_catalog.to_jsonb(new.id::text), true
      ),
      '{paperTitle}', pg_catalog.to_jsonb(new.title), true
    ),
    '{paperUrl}', pg_catalog.to_jsonb(new.paper_url), true
  )
  where paper_id = new.id;
  return new;
end;
$$;

drop trigger if exists lab_papers_protect_identity on public.lab_papers;
create trigger lab_papers_protect_identity before update on public.lab_papers
for each row execute function public.protect_lab_paper_identity();
drop trigger if exists lab_papers_sync_mission_snapshots on public.lab_papers;
create trigger lab_papers_sync_mission_snapshots after update of title, paper_url
on public.lab_papers for each row execute function public.sync_paper_mission_snapshots();
drop trigger if exists quest_chapters_protect_lab on public.quest_chapters;
create trigger quest_chapters_protect_lab before update of lab_id
on public.quest_chapters for each row execute function public.protect_quest_chapter_lab();
drop trigger if exists paper_progress_touch_updated_at on public.paper_progress;
create trigger paper_progress_touch_updated_at before update on public.paper_progress
for each row execute function public.touch_updated_at();
drop trigger if exists paper_comments_touch_updated_at on public.paper_comments;
create trigger paper_comments_touch_updated_at before update on public.paper_comments
for each row execute function public.touch_updated_at();
drop trigger if exists quest_missions_validate_paper on public.quest_missions;
create trigger quest_missions_validate_paper before insert or update of paper_id, chapter_id, content
on public.quest_missions for each row execute function public.validate_quest_paper_link();

revoke all on function public.sync_paper_mission_snapshots() from public;

alter table public.lab_papers enable row level security;
alter table public.paper_progress enable row level security;
alter table public.paper_comments enable row level security;

drop policy if exists "Lab members can view papers" on public.lab_papers;
create policy "Lab members can view papers"
  on public.lab_papers for select to authenticated
  using (public.is_lab_member(lab_id));
drop policy if exists "Lab admins can create papers" on public.lab_papers;
create policy "Lab admins can create papers"
  on public.lab_papers for insert to authenticated
  with check (
    created_by = (select auth.uid()) and public.is_lab_admin(lab_id)
  );
drop policy if exists "Lab admins can update papers" on public.lab_papers;
create policy "Lab admins can update papers"
  on public.lab_papers for update to authenticated
  using (public.is_lab_admin(lab_id))
  with check (public.is_lab_admin(lab_id));
drop policy if exists "Lab admins can delete papers" on public.lab_papers;
create policy "Lab admins can delete papers"
  on public.lab_papers for delete to authenticated
  using (public.is_lab_admin(lab_id));

drop policy if exists "Lab members can view paper progress" on public.paper_progress;
create policy "Lab members can view paper progress"
  on public.paper_progress for select to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );
drop policy if exists "Members can create their paper progress" on public.paper_progress;
create policy "Members can create their paper progress"
  on public.paper_progress for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );
drop policy if exists "Members can update their paper progress" on public.paper_progress;
create policy "Members can update their paper progress"
  on public.paper_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

drop policy if exists "Lab members can view paper comments" on public.paper_comments;
create policy "Lab members can view paper comments"
  on public.paper_comments for select to authenticated
  using (
    exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );
drop policy if exists "Lab members can create paper comments" on public.paper_comments;
create policy "Lab members can create paper comments"
  on public.paper_comments for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );
drop policy if exists "Authors can update paper comments" on public.paper_comments;
create policy "Authors can update paper comments"
  on public.paper_comments for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );
drop policy if exists "Authors or admins can delete paper comments" on public.paper_comments;
create policy "Authors or admins can delete paper comments"
  on public.paper_comments for delete to authenticated
  using (
    (user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as own_paper
      where own_paper.id = paper_id and public.is_lab_member(own_paper.lab_id)
    )) or exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_admin(paper.lab_id)
    )
  );

grant select on public.lab_papers, public.paper_progress, public.paper_comments
  to authenticated;
grant insert, delete on public.lab_papers to authenticated;
grant update (title, authors, abstract, paper_url, published_year, tags, updated_at)
  on public.lab_papers to authenticated;
grant insert, update, delete on public.paper_progress, public.paper_comments
  to authenticated;

create or replace function public.reorder_quest_chapters(
  target_lab_id uuid,
  ordered_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_count integer;
  staging_offset bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quest-chapters:' || target_lab_id::text, 0)
  );
  perform 1 from public.labs where id = target_lab_id for update;
  perform 1 from public.lab_members
  where lab_id = target_lab_id and user_id = (select auth.uid())
  for update;
  if not public.is_lab_admin(target_lab_id) then
    raise exception 'Lab admin access required';
  end if;
  perform 1 from public.quest_chapters where lab_id = target_lab_id for update;

  select count(*), coalesce(max(order_index), 0)
  into expected_count, staging_offset
  from public.quest_chapters where lab_id = target_lab_id;
  if staging_offset + expected_count >= 2147483647 then
    raise exception 'Chapter order exceeds supported range';
  end if;

  if coalesce(cardinality(ordered_ids), 0) <> expected_count
    or (select count(distinct item_id) from unnest(ordered_ids) as ordered(item_id)) <> expected_count
    or exists (
      select 1 from unnest(ordered_ids) as ordered(item_id)
      where not exists (
        select 1 from public.quest_chapters
        where id = ordered.item_id and lab_id = target_lab_id
      )
    ) then
    raise exception 'Chapter order must contain every chapter exactly once';
  end if;

  update public.quest_chapters
  set order_index = (staging_offset + array_position(ordered_ids, id))::integer
  where lab_id = target_lab_id;

  update public.quest_chapters
  set order_index = array_position(ordered_ids, id)
  where lab_id = target_lab_id;
end;
$$;

create or replace function public.reorder_quest_missions(
  target_chapter_id uuid,
  ordered_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_lab_id uuid;
  expected_count integer;
  staging_offset bigint;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('quest-missions:' || target_chapter_id::text, 0)
  );
  select lab_id into target_lab_id
  from public.quest_chapters where id = target_chapter_id for update;
  perform 1 from public.labs where id = target_lab_id for update;
  perform 1 from public.lab_members
  where lab_id = target_lab_id and user_id = (select auth.uid())
  for update;
  if target_lab_id is null or not public.is_lab_admin(target_lab_id) then
    raise exception 'Lab admin access required';
  end if;
  perform 1 from public.quest_missions where chapter_id = target_chapter_id for update;

  select count(*), coalesce(max(order_index), 0)
  into expected_count, staging_offset
  from public.quest_missions where chapter_id = target_chapter_id;
  if staging_offset + expected_count >= 2147483647 then
    raise exception 'Mission order exceeds supported range';
  end if;

  if coalesce(cardinality(ordered_ids), 0) <> expected_count
    or (select count(distinct item_id) from unnest(ordered_ids) as ordered(item_id)) <> expected_count
    or exists (
      select 1 from unnest(ordered_ids) as ordered(item_id)
      where not exists (
        select 1 from public.quest_missions
        where id = ordered.item_id and chapter_id = target_chapter_id
      )
    ) then
    raise exception 'Mission order must contain every mission exactly once';
  end if;

  update public.quest_missions
  set order_index = (staging_offset + array_position(ordered_ids, id))::integer
  where chapter_id = target_chapter_id;

  update public.quest_missions
  set order_index = array_position(ordered_ids, id)
  where chapter_id = target_chapter_id;
end;
$$;

revoke all on function public.reorder_quest_chapters(uuid, uuid[]) from public;
revoke all on function public.reorder_quest_missions(uuid, uuid[]) from public;
grant execute on function public.reorder_quest_chapters(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_quest_missions(uuid, uuid[]) to authenticated;
