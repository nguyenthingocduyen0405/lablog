create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  description text not null default '' check (char_length(description) <= 300),
  category text not null default 'other' check (category in ('travel', 'conference', 'deadline', 'leave', 'other')),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint calendar_events_valid_range check (ends_on >= starts_on)
);

create index if not exists calendar_events_date_range_idx
on public.calendar_events (starts_on, ends_on);

create index if not exists calendar_events_user_id_created_at_idx
on public.calendar_events (user_id, created_at desc);

alter table public.calendar_events enable row level security;

drop policy if exists "Lab members can view shared calendar events" on public.calendar_events;
create policy "Lab members can view shared calendar events"
on public.calendar_events for select to authenticated
using (true);

drop policy if exists "Members can create their calendar events" on public.calendar_events;
create policy "Members can create their calendar events"
on public.calendar_events for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can update their calendar events" on public.calendar_events;
create policy "Members can update their calendar events"
on public.calendar_events for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Members can delete their calendar events" on public.calendar_events;
create policy "Members can delete their calendar events"
on public.calendar_events for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.calendar_events to authenticated;
