-- Track Lab Tour completion independently for every lab tenant.

alter table public.lab_member_progress
add column if not exists lab_tour_completed_at timestamptz;

-- Anyone who already completed Chapter 1 has necessarily passed the tour.
update public.lab_member_progress
set lab_tour_completed_at = onboarding_completed_at
where lab_tour_completed_at is null
  and onboarding_completed_at is not null;

-- Preserve the position of members who started a quest before this column existed.
update public.lab_member_progress as progress
set lab_tour_completed_at = first_mission.completed_at
from (
  select chapter.lab_id, mission_progress.user_id,
    min(mission_progress.completed_at) as completed_at
  from public.quest_mission_progress as mission_progress
  join public.quest_missions as mission on mission.id = mission_progress.mission_id
  join public.quest_chapters as chapter on chapter.id = mission.chapter_id
  group by chapter.lab_id, mission_progress.user_id
) as first_mission
where progress.lab_id = first_mission.lab_id
  and progress.user_id = first_mission.user_id
  and progress.lab_tour_completed_at is null;
