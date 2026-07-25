-- QA tenant for exercising the three-level role model without personal data.
-- Safe to run repeatedly: existing ML Lab ownership and Quest rows are kept.

do $$
declare
  os_lab_id constant uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  seeded_ml_lab_id constant uuid := '22222222-2222-4222-8222-222222222222'::uuid;
  ml_lab_id uuid;
  os_owner_id uuid;
  ml_owner_id uuid;
  source_chapter record;
  target_chapter_id uuid;
  copied_chapter_count integer := 0;
begin
  select owner_id into os_owner_id from public.labs where id = os_lab_id;
  if not found then
    raise exception 'OS Lab is missing. Run the multi-lab migration first.';
  end if;
  if os_owner_id is null then
    raise exception 'OS Lab needs an owner before ML Lab can be seeded.';
  end if;

  -- Reuse an ML Lab created earlier through the UI, even if its UUID differs
  -- from the deterministic QA UUID.
  select id into ml_lab_id
  from public.labs
  where slug = 'ml-lab';

  if ml_lab_id is null then
    insert into public.labs (
      id, slug, name, description, owner_id, map_image_url,
      default_locale, theme_config
    )
    values (
      seeded_ml_lab_id,
      'ml-lab',
      'ML Lab',
      'Machine Learning Laboratory QA workspace',
      os_owner_id,
      '/lab-tour-room-v5.png',
      'en',
      jsonb_build_object(
        'accent', '#7c3aed',
        'surface', '#f5f3ff',
        'ink', '#1f1733'
      )
    )
    on conflict do nothing;

    select id into ml_lab_id
    from public.labs
    where slug = 'ml-lab';
  end if;

  if ml_lab_id is null then
    raise exception 'Could not create or locate ML Lab.';
  end if;

  -- Reruns respect any ownership transfer made after the first seed.
  select owner_id into ml_owner_id from public.labs where id = ml_lab_id;
  if ml_owner_id is null then
    -- An existing UI-created lab may still be waiting for owner assignment.
    -- Leave it untouched instead of blocking later, unrelated migrations.
    return;
  end if;

  insert into public.lab_members (lab_id, user_id, membership_role)
  values (ml_lab_id, ml_owner_id, 'owner')
  on conflict (lab_id, user_id) do nothing;

  insert into public.lab_member_progress (lab_id, user_id)
  values (ml_lab_id, ml_owner_id)
  on conflict (lab_id, user_id) do nothing;

  -- Clone only reusable Quest definitions. Posts, personal missions, projects,
  -- meetings, rewards, progress, and other activity are deliberately excluded.
  if not exists (
    select 1 from public.quest_chapters where lab_id = ml_lab_id
  ) then
    for source_chapter in
      select * from public.quest_chapters
      where lab_id = os_lab_id
      order by order_index
    loop
      insert into public.quest_chapters (
        lab_id, order_index, title_i18n, description_i18n,
        unlock_rule, active
      )
      values (
        ml_lab_id,
        source_chapter.order_index,
        source_chapter.title_i18n,
        source_chapter.description_i18n,
        source_chapter.unlock_rule,
        source_chapter.active
      )
      returning id into target_chapter_id;

      insert into public.quest_missions (
        chapter_id, order_index, mission_type, title_i18n,
        instructions_i18n, content, validation, active
      )
      select
        target_chapter_id, order_index, mission_type, title_i18n,
        instructions_i18n, content, validation, active
      from public.quest_missions
      where chapter_id = source_chapter.id
      order by order_index;

      copied_chapter_count := copied_chapter_count + 1;
    end loop;

    -- OS Lab can use code-backed Quests and therefore have no database rows.
    if copied_chapter_count = 0 then
      insert into public.quest_chapters (
        lab_id, order_index, title_i18n, description_i18n, active
      )
      values (
        ml_lab_id,
        1,
        jsonb_build_object(
          'ko', 'ML Lab onboarding',
          'vi', 'Bat dau voi ML Lab',
          'en', 'ML Lab onboarding'
        ),
        jsonb_build_object(
          'ko', 'Meet the lab and prepare a first experiment.',
          'vi', 'Lam quen voi Lab va chuan bi thi nghiem dau tien.',
          'en', 'Meet the lab and prepare a first experiment.'
        ),
        true
      )
      returning id into target_chapter_id;

      insert into public.quest_missions (
        chapter_id, order_index, mission_type, title_i18n,
        instructions_i18n, content, validation, active
      )
      values
        (
          target_chapter_id, 1, 'custom',
          jsonb_build_object(
            'ko', 'Meet the ML Lab',
            'vi', 'Gap go ML Lab',
            'en', 'Meet the ML Lab'
          ),
          jsonb_build_object(
            'ko', 'Meet two members and learn their research topics.',
            'vi', 'Gap hai thanh vien va tim hieu chu de nghien cuu.',
            'en', 'Meet two members and learn their research topics.'
          ),
          '{}'::jsonb, '{}'::jsonb, true
        ),
        (
          target_chapter_id, 2, 'quiz',
          jsonb_build_object(
            'ko', 'Check the data rules',
            'vi', 'Kiem tra quy tac du lieu',
            'en', 'Check the data rules'
          ),
          jsonb_build_object(
            'ko', 'What should happen before using sensitive data?',
            'vi', 'Can lam gi truoc khi dung du lieu nhay cam?',
            'en', 'What should happen before using sensitive data?'
          ),
          jsonb_build_object(
            'options', jsonb_build_array(
              'Confirm permission and handling rules',
              'Upload it to a public drive',
              'Share it with another account'
            )
          ),
          jsonb_build_object('answerIndex', 0),
          true
        ),
        (
          target_chapter_id, 3, 'paper',
          jsonb_build_object(
            'ko', 'First experiment goal',
            'vi', 'Muc tieu thi nghiem dau tien',
            'en', 'First experiment goal'
          ),
          jsonb_build_object(
            'ko', 'Write an ML hypothesis to test this week.',
            'vi', 'Viet mot gia thuyet ML de kiem tra trong tuan nay.',
            'en', 'Write an ML hypothesis to test this week.'
          ),
          '{}'::jsonb, '{}'::jsonb, true
        );
    end if;
  end if;
end;
$$;
