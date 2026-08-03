-- Repair OS Lab progress rows that were created before legacy completion
-- fields were copied into the per-lab progress model.

update public.lab_member_progress as progress
set
  lab_tour_completed_at = coalesce(
    progress.lab_tour_completed_at,
    progress.onboarding_completed_at,
    profile.onboarding_completed_at
  ),
  onboarding_completed_at = coalesce(
    progress.onboarding_completed_at,
    profile.onboarding_completed_at
  ),
  chapter_two_completed_at = coalesce(
    progress.chapter_two_completed_at,
    nullif(
      auth_user.raw_user_meta_data ->> 'labquest_chapter2_completed_at',
      ''
    )::timestamptz
  ),
  chapter_three_completed_at = coalesce(
    progress.chapter_three_completed_at,
    nullif(
      auth_user.raw_user_meta_data ->> 'labquest_chapter3_completed_at',
      ''
    )::timestamptz
  ),
  updated_at = now()
from public.profiles as profile
left join auth.users as auth_user on auth_user.id = profile.id
where progress.lab_id = '11111111-1111-4111-8111-111111111111'::uuid
  and progress.user_id = profile.id
  and (
    (
      progress.lab_tour_completed_at is null
      and coalesce(
        progress.onboarding_completed_at,
        profile.onboarding_completed_at
      ) is not null
    )
    or (
      progress.onboarding_completed_at is null
      and profile.onboarding_completed_at is not null
    )
    or (
      progress.chapter_two_completed_at is null
      and nullif(
        auth_user.raw_user_meta_data ->> 'labquest_chapter2_completed_at',
        ''
      ) is not null
    )
    or (
      progress.chapter_three_completed_at is null
      and nullif(
        auth_user.raw_user_meta_data ->> 'labquest_chapter3_completed_at',
        ''
      ) is not null
    )
  );
