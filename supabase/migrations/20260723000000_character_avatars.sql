alter table public.profiles
add column if not exists avatar_config jsonb not null default '{
  "skin": "#f2b98c",
  "hair": "wave",
  "hairColor": "#3d2a22",
  "outfitColor": "#7c5cff",
  "accessory": "none"
}'::jsonb;

alter table public.profiles
drop constraint if exists profiles_avatar_config_object_check;

alter table public.profiles
add constraint profiles_avatar_config_object_check
check (jsonb_typeof(avatar_config) = 'object');
