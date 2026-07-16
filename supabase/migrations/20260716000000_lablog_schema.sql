create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'Lab member' check (char_length(role) between 1 and 120),
  status text not null default '오늘의 기록을 준비 중' check (char_length(status) <= 120),
  initials text not null check (char_length(initials) between 1 and 4),
  avatar_background text not null default 'linear-gradient(135deg, #ffd84d, #ff8a4c)',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null check (char_length(caption) between 1 and 180),
  image_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists posts_user_id_created_at_idx on public.posts(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy "Authenticated members can view profiles"
on public.profiles for select to authenticated using (true);

create policy "Members can update their profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Authenticated members can view posts"
on public.posts for select to authenticated using (true);

create policy "Members can create their posts"
on public.posts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Members can update their posts"
on public.posts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Members can delete their posts"
on public.posts for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, role, initials, avatar_background)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'Lab member'),
    coalesce(nullif(new.raw_user_meta_data ->> 'initials', ''), upper(left(split_part(new.email, '@', 1), 2))),
    coalesce(nullif(new.raw_user_meta_data ->> 'avatar_background', ''), 'linear-gradient(135deg, #ffd84d, #ff8a4c)')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', true, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated members can upload post images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'post-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Members can update their post images"
on storage.objects for update to authenticated
using (bucket_id = 'post-images' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'post-images' and owner_id = (select auth.uid())::text);

create policy "Members can delete their post images"
on storage.objects for delete to authenticated
using (bucket_id = 'post-images' and owner_id = (select auth.uid())::text);
