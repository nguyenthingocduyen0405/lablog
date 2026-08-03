-- Keep the uploaded map and its normalized seat overlay in the same Lab record.
alter table public.labs
add column if not exists map_aspect_ratio double precision
not null default (1672.0 / 941.0);

alter table public.labs
add column if not exists map_seat_layout jsonb
not null default '[
  {"side":"left","x":42,"y":38,"scale":0.5,"depth":1},
  {"side":"right","x":59,"y":38,"scale":0.5,"depth":1},
  {"side":"left","x":41,"y":43,"scale":0.62,"depth":2},
  {"side":"right","x":60,"y":43,"scale":0.62,"depth":2},
  {"side":"left","x":39,"y":49,"scale":0.74,"depth":3},
  {"side":"right","x":62,"y":49,"scale":0.74,"depth":3},
  {"side":"left","x":38,"y":55,"scale":0.88,"depth":4},
  {"side":"right","x":64,"y":55,"scale":0.88,"depth":4}
]'::jsonb;

alter table public.labs
drop constraint if exists labs_map_aspect_ratio_check;

alter table public.labs
add constraint labs_map_aspect_ratio_check
check (map_aspect_ratio between 0.5 and 3);

alter table public.labs
drop constraint if exists labs_map_seat_layout_check;

alter table public.labs
add constraint labs_map_seat_layout_check
check (
  jsonb_typeof(map_seat_layout) = 'array'
  and jsonb_array_length(map_seat_layout) = 8
);
