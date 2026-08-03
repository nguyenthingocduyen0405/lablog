-- A Lab Admin is scoped to labs where their membership role is owner/admin.
-- Platform admins retain the same management abilities across every lab.
create or replace function public.is_lab_admin(
  target_lab_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_platform_admin(target_user_id) or exists (
    select 1
    from public.lab_members
    where lab_id = target_lab_id
      and user_id = target_user_id
      and membership_role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_lab_admin(uuid, uuid) from public;
grant execute on function public.is_lab_admin(uuid, uuid) to authenticated;
