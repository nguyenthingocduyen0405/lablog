alter table public.online_meetings
add column if not exists meeting_notes text not null default '',
add column if not exists notes_updated_at timestamptz,
add column if not exists notes_updated_by uuid references public.profiles(id) on delete set null;

alter table public.online_meetings
drop constraint if exists online_meetings_notes_length_check;

alter table public.online_meetings
add constraint online_meetings_notes_length_check
check (char_length(meeting_notes) <= 20000);

create index if not exists online_meetings_project_history_idx
on public.online_meetings (project_id, ended_at desc)
where project_id is not null;

create or replace function public.save_project_meeting_notes(target_meeting_id uuid, notes_content text)
returns public.online_meetings
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_id uuid := (select auth.uid());
  updated_meeting public.online_meetings;
begin
  if member_id is null then raise exception 'Authentication required'; end if;
  if char_length(coalesce(notes_content, '')) > 20000 then raise exception 'Meeting notes are too long'; end if;

  update public.online_meetings as meeting
  set meeting_notes = coalesce(notes_content, ''),
      notes_updated_at = now(),
      notes_updated_by = member_id
  where meeting.id = target_meeting_id
    and meeting.ended_at is null
    and (
      meeting.creator_id = member_id
      or exists (
        select 1 from public.team_project_members as member
        where member.project_id = meeting.project_id
          and member.user_id = member_id
          and member.status = 'accepted'
      )
    )
  returning meeting.* into updated_meeting;

  if not found then raise exception 'Only active project members can edit live meeting notes'; end if;
  return updated_meeting;
end;
$$;

revoke all on function public.save_project_meeting_notes(uuid, text) from public;
grant execute on function public.save_project_meeting_notes(uuid, text) to authenticated;
