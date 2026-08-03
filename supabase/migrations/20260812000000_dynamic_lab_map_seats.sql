-- A Lab can expose between one and one hundred seats.
alter table public.labs
drop constraint if exists labs_map_seat_layout_check;

alter table public.labs
add constraint labs_map_seat_layout_check
check (
  jsonb_typeof(map_seat_layout) = 'array'
  and jsonb_array_length(map_seat_layout) between 1 and 100
);

-- Seats are removed from the end so existing indexes stay stable. If the
-- removed final seat was occupied, that member can choose another seat.
create or replace function public.clear_removed_lab_map_seats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_seat_count integer;
begin
  next_seat_count := jsonb_array_length(new.map_seat_layout);
  if next_seat_count < jsonb_array_length(old.map_seat_layout) then
    update public.lab_members
    set seat_index = null
    where lab_id = new.id
      and seat_index >= next_seat_count;
  end if;
  return new;
end;
$$;

revoke all on function public.clear_removed_lab_map_seats() from public;

drop trigger if exists clear_removed_lab_map_seats
on public.labs;

create trigger clear_removed_lab_map_seats
after update of map_seat_layout on public.labs
for each row
when (old.map_seat_layout is distinct from new.map_seat_layout)
execute function public.clear_removed_lab_map_seats();
