create table if not exists public.online_meetings (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  room_name text not null unique default ('oslab-' || replace(gen_random_uuid()::text, '-', '')),
  starts_at timestamptz not null default now(),
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  created_at timestamptz not null default now()
);

create index if not exists online_meetings_starts_at_idx
on public.online_meetings (starts_at desc);

alter table public.online_meetings enable row level security;

drop policy if exists "Lab members can view online meetings" on public.online_meetings;
create policy "Lab members can view online meetings"
on public.online_meetings for select to authenticated
using (true);

drop policy if exists "Members can create online meetings" on public.online_meetings;
create policy "Members can create online meetings"
on public.online_meetings for insert to authenticated
with check ((select auth.uid()) = creator_id);

drop policy if exists "Creators can update online meetings" on public.online_meetings;
create policy "Creators can update online meetings"
on public.online_meetings for update to authenticated
using ((select auth.uid()) = creator_id)
with check ((select auth.uid()) = creator_id);

drop policy if exists "Creators can delete online meetings" on public.online_meetings;
create policy "Creators can delete online meetings"
on public.online_meetings for delete to authenticated
using ((select auth.uid()) = creator_id);

grant select, insert, update, delete on public.online_meetings to authenticated;
