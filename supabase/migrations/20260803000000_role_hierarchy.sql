-- Three-level authorization: platform admin, lab owner/admin, and lab member.

create table if not exists public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.is_platform_admin(
  target_user_id uuid default auth.uid()
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = target_user_id
  );
$$;

revoke all on function public.is_platform_admin(uuid) from public;
grant execute on function public.is_platform_admin(uuid) to authenticated;

-- Bootstrap the existing OS Lab owner as the first platform administrator.
insert into public.platform_admins (user_id)
select owner_id
from public.labs
where id = '11111111-1111-4111-8111-111111111111'::uuid
  and owner_id is not null
on conflict (user_id) do nothing;

create policy "Platform admins can view platform admins"
on public.platform_admins for select to authenticated
using (public.is_platform_admin());

create policy "Platform admins can view every lab"
on public.labs for select to authenticated
using (public.is_platform_admin());

create policy "Platform admins can view every membership"
on public.lab_members for select to authenticated
using (public.is_platform_admin());

create policy "Platform admins can view every profile"
on public.profiles for select to authenticated
using (public.is_platform_admin());

-- Membership mutations go through guarded RPCs instead of a broad table policy.
drop policy if exists "Admins can manage lab memberships" on public.lab_members;

create or replace function public.update_lab_member_role(
  target_lab_id uuid,
  target_user_id uuid,
  target_role text
)
returns public.lab_members
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  updated_membership public.lab_members;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if target_role not in ('admin', 'member') then
    raise exception 'Role must be admin or member';
  end if;

  select membership_role into caller_role
  from public.lab_members
  where lab_id = target_lab_id and user_id = caller_id;

  if caller_role <> 'owner' and not public.is_platform_admin(caller_id) then
    raise exception 'Only the lab owner can change member roles';
  end if;
  if target_user_id = caller_id then
    raise exception 'The lab owner cannot change their own role';
  end if;
  if target_user_id = (select owner_id from public.labs where id = target_lab_id) then
    raise exception 'Transfer ownership before changing the owner role';
  end if;

  update public.lab_members
  set membership_role = target_role
  where lab_id = target_lab_id and user_id = target_user_id
  returning * into updated_membership;

  if updated_membership is null then raise exception 'Lab member not found'; end if;
  return updated_membership;
end;
$$;

create or replace function public.remove_lab_member(
  target_lab_id uuid,
  target_user_id uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  caller_role text;
  target_membership_role text;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;

  select membership_role into caller_role
  from public.lab_members
  where lab_id = target_lab_id and user_id = caller_id;
  select membership_role into target_membership_role
  from public.lab_members
  where lab_id = target_lab_id and user_id = target_user_id;

  if caller_role not in ('owner', 'admin') and not public.is_platform_admin(caller_id) then
    raise exception 'Lab admin access required';
  end if;
  if target_membership_role = 'owner' then
    raise exception 'The lab owner cannot be removed';
  end if;
  if caller_role = 'admin' and target_membership_role <> 'member' then
    raise exception 'Admins can only remove regular members';
  end if;

  delete from public.lab_members
  where lab_id = target_lab_id and user_id = target_user_id;
end;
$$;

create or replace function public.rotate_lab_join_code(target_lab_id uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  next_code text;
begin
  if caller_id is null then raise exception 'Authentication required'; end if;
  if not public.is_lab_admin(target_lab_id, caller_id)
    and not public.is_platform_admin(caller_id) then
    raise exception 'Lab admin access required';
  end if;

  next_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.labs
  set join_code = next_code, updated_at = now()
  where id = target_lab_id;
  return next_code;
end;
$$;

revoke all on function public.update_lab_member_role(uuid, uuid, text) from public;
revoke all on function public.remove_lab_member(uuid, uuid) from public;
revoke all on function public.rotate_lab_join_code(uuid) from public;
grant execute on function public.update_lab_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_lab_member(uuid, uuid) to authenticated;
grant execute on function public.rotate_lab_join_code(uuid) to authenticated;
grant select on public.platform_admins to authenticated;

-- New users join only the invited lab. Without a code they can create or join
-- a lab from /labs after signing in.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  invite_code text := upper(btrim(coalesce(new.raw_user_meta_data ->> 'join_code', '')));
  invited_lab_id uuid;
begin
  insert into public.profiles (id, name, role, initials, avatar_background)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'Lab member'),
    coalesce(new.raw_user_meta_data ->> 'initials', upper(left(new.email, 2))),
    coalesce(new.raw_user_meta_data ->> 'avatar_background', 'linear-gradient(135deg, #ffd84d, #ff8a4c)')
  );

  if invite_code <> '' then
    select id into invited_lab_id
    from public.labs
    where join_code = invite_code;

    if invited_lab_id is not null then
      insert into public.lab_members (lab_id, user_id, membership_role)
      values (invited_lab_id, new.id, 'member')
      on conflict do nothing;
      insert into public.lab_member_progress (lab_id, user_id)
      values (invited_lab_id, new.id)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;
