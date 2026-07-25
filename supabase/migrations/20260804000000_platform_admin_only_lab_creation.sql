create or replace function public.create_lab(
  lab_name text, lab_slug text, lab_description text default '', lab_default_locale text default 'ko'
)
returns public.labs
language plpgsql security definer set search_path = public
as $$
declare
  member_id uuid := auth.uid();
  created_lab public.labs;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  if not exists (select 1 from public.platform_admins where user_id = member_id) then
    raise exception 'Only platform admins can create labs';
  end if;
  lab_slug := lower(btrim(lab_slug));
  if lab_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then raise exception 'Slug must contain lowercase letters, numbers, and hyphens only'; end if;
  if lab_default_locale not in ('ko', 'vi', 'en') then lab_default_locale := 'ko'; end if;
  insert into public.labs (name, slug, description, owner_id, default_locale)
  values (btrim(lab_name), lab_slug, left(coalesce(lab_description, ''), 500), member_id, lab_default_locale)
  returning * into created_lab;
  insert into public.lab_members (lab_id, user_id, membership_role) values (created_lab.id, member_id, 'owner');
  insert into public.lab_member_progress (lab_id, user_id) values (created_lab.id, member_id);
  return created_lab;
end;
$$;
