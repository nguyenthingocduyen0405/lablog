create or replace function public.rename_team_project(target_project_id uuid, project_name text)
returns public.team_projects
language plpgsql
security definer
set search_path = ''
as $$
declare
  host_id uuid := (select auth.uid());
  updated_project public.team_projects;
begin
  if host_id is null then raise exception 'Authentication required'; end if;
  project_name := btrim(project_name);
  if char_length(project_name) not between 1 and 100 then raise exception 'Invalid project name'; end if;

  update public.team_projects
  set name = project_name
  where id = target_project_id and owner_id = host_id
  returning * into updated_project;

  if not found then raise exception 'Only the project host can rename this project'; end if;

  update public.notifications
  set project_title = project_name
  where project_id = target_project_id;

  return updated_project;
end;
$$;

revoke all on function public.rename_team_project(uuid, text) from public;
grant execute on function public.rename_team_project(uuid, text) to authenticated;
