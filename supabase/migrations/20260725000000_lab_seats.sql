alter table public.profiles
add column if not exists lab_seat smallint;

alter table public.profiles
drop constraint if exists profiles_lab_seat_range_check;

alter table public.profiles
add constraint profiles_lab_seat_range_check
check (lab_seat between 0 and 7);

with ranked_profiles as (
  select id, row_number() over (order by created_at, id) - 1 as seat_index
  from public.profiles
  where lab_seat is null
    and not exists (select 1 from public.profiles where lab_seat is not null)
)
update public.profiles as profile
set lab_seat = ranked_profiles.seat_index
from ranked_profiles
where profile.id = ranked_profiles.id
  and ranked_profiles.seat_index between 0 and 7;

create unique index if not exists profiles_lab_seat_unique_idx
on public.profiles (lab_seat)
where lab_seat is not null;
