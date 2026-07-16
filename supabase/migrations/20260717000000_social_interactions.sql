create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👏', '🔥', '💡', '❤️')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('reaction', 'comment')),
  emoji text,
  comment_preview text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_created_at_idx on public.post_comments(post_id, created_at);
create index if not exists notifications_recipient_created_at_idx on public.notifications(recipient_id, created_at desc);

alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.notifications enable row level security;

create policy "Members can view reactions" on public.post_reactions
for select to authenticated using (true);
create policy "Members can add their reactions" on public.post_reactions
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members can change their reactions" on public.post_reactions
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Members can remove their reactions" on public.post_reactions
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Members can view comments" on public.post_comments
for select to authenticated using (true);
create policy "Members can add their comments" on public.post_comments
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Members can update their comments" on public.post_comments
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Members can remove their comments" on public.post_comments
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Members can view their notifications" on public.notifications
for select to authenticated using ((select auth.uid()) = recipient_id);
create policy "Members can mark their notifications read" on public.notifications
for update to authenticated using ((select auth.uid()) = recipient_id)
with check ((select auth.uid()) = recipient_id);
create policy "Members can remove their notifications" on public.notifications
for delete to authenticated using ((select auth.uid()) = recipient_id);

create or replace function public.notify_post_interaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_owner uuid;
begin
  select user_id into post_owner from public.posts where id = new.post_id;
  if post_owner is null or post_owner = new.user_id then
    return new;
  end if;

  if tg_table_name = 'post_reactions' then
    insert into public.notifications (recipient_id, actor_id, post_id, type, emoji)
    values (post_owner, new.user_id, new.post_id, 'reaction', new.emoji);
  else
    insert into public.notifications (recipient_id, actor_id, post_id, type, comment_preview)
    values (post_owner, new.user_id, new.post_id, 'comment', left(new.body, 120));
  end if;
  return new;
end;
$$;

drop trigger if exists on_post_reaction_notify on public.post_reactions;
create trigger on_post_reaction_notify
after insert or update of emoji on public.post_reactions
for each row execute procedure public.notify_post_interaction();

drop trigger if exists on_post_comment_notify on public.post_comments;
create trigger on_post_comment_notify
after insert on public.post_comments
for each row execute procedure public.notify_post_interaction();
