-- Normalize the bespoke OS Lab experience into the shared Quest catalog.

alter table public.quest_chapters
add column if not exists source_key text;

alter table public.quest_missions
add column if not exists source_key text;

create unique index if not exists quest_chapters_lab_source_key_idx
on public.quest_chapters (lab_id, source_key)
where source_key is not null;

create unique index if not exists quest_missions_chapter_source_key_idx
on public.quest_missions (chapter_id, source_key)
where source_key is not null;

create table if not exists public.quest_mission_progress (
  mission_id uuid not null references public.quest_missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  answer jsonb not null default '{}'::jsonb,
  primary key (mission_id, user_id)
);

create index if not exists quest_mission_progress_user_completed_idx
on public.quest_mission_progress (user_id, completed_at desc);

alter table public.quest_mission_progress enable row level security;

drop policy if exists "Members can view own quest mission progress"
on public.quest_mission_progress;
create policy "Members can view own quest mission progress"
on public.quest_mission_progress for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.quest_missions as mission
    join public.quest_chapters as chapter on chapter.id = mission.chapter_id
    where mission.id = mission_id
      and public.is_lab_member(chapter.lab_id)
  )
);

drop policy if exists "Members can create own quest mission progress"
on public.quest_mission_progress;
create policy "Members can create own quest mission progress"
on public.quest_mission_progress for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.quest_missions as mission
    join public.quest_chapters as chapter on chapter.id = mission.chapter_id
    where mission.id = mission_id
      and public.is_lab_member(chapter.lab_id)
  )
);

drop policy if exists "Members can update own quest mission progress"
on public.quest_mission_progress;
create policy "Members can update own quest mission progress"
on public.quest_mission_progress for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

insert into public.quest_chapters (
  id, lab_id, order_index, source_key, title_i18n,
  description_i18n, unlock_rule, active
)
select
  seed.id,
  '11111111-1111-4111-8111-111111111111'::uuid,
  coalesce((
    select max(chapter.order_index)
    from public.quest_chapters as chapter
    where chapter.lab_id = '11111111-1111-4111-8111-111111111111'::uuid
  ), 0) + seed.chapter_number,
  seed.source_key,
  seed.title_i18n,
  seed.description_i18n,
  jsonb_build_object(
    'renderer', 'os-lab',
    'chapterNumber', seed.chapter_number,
    'previousChapterRequired', seed.chapter_number > 1
  ),
  true
from (
  values
    (
      'a1000000-0000-4000-8000-000000000001'::uuid,
      1,
      'os-chapter-1',
      '{"ko":"운영체제의 비밀 정원","vi":"Khu vườn bí mật của hệ điều hành","en":"The secret garden of operating systems"}'::jsonb,
      '{"ko":"CPU, 메모리, 저장장치를 통해 OS의 핵심 추상화를 체험합니다.","vi":"Trải nghiệm các khái niệm OS qua CPU, bộ nhớ và lưu trữ.","en":"Experience core OS abstractions through CPU, memory and storage."}'::jsonb
    ),
    (
      'a1000000-0000-4000-8000-000000000002'::uuid,
      2,
      'os-chapter-2',
      '{"ko":"논문 익숙해지기","vi":"Làm quen với paper","en":"Getting familiar with papers"}'::jsonb,
      '{"ko":"논문 구조를 이해하고 핵심 내용을 찾는 방법을 연습합니다.","vi":"Hiểu cấu trúc paper và luyện cách tìm nội dung quan trọng.","en":"Understand paper structure and learn how to find key ideas."}'::jsonb
    ),
    (
      'a1000000-0000-4000-8000-000000000003'::uuid,
      3,
      'os-chapter-3',
      '{"ko":"프로젝트 준비","vi":"Chuẩn bị Project","en":"Project readiness"}'::jsonb,
      '{"ko":"C, OS, 알고리즘, 데이터베이스 실전 문제로 프로젝트 준비도를 확인합니다.","vi":"Kiểm tra mức độ sẵn sàng qua C, OS, thuật toán và cơ sở dữ liệu.","en":"Prove project readiness with C, OS, algorithm and database challenges."}'::jsonb
    )
) as seed(id, chapter_number, source_key, title_i18n, description_i18n)
where exists (
  select 1 from public.labs
  where id = '11111111-1111-4111-8111-111111111111'::uuid
)
on conflict (id) do update
set source_key = excluded.source_key,
    title_i18n = excluded.title_i18n,
    description_i18n = excluded.description_i18n,
    unlock_rule = excluded.unlock_rule,
    active = true;

insert into public.quest_missions (
  id, chapter_id, order_index, source_key, mission_type,
  title_i18n, instructions_i18n, content, validation, active
)
select
  seed.id,
  seed.chapter_id,
  seed.mission_number,
  seed.game_key,
  'custom',
  seed.title_i18n,
  seed.instructions_i18n,
  jsonb_build_object(
    'renderer', 'os-lab',
    'gameKey', seed.game_key,
    'rewardLabel', seed.reward_label,
    'rewardPoints', seed.reward_points,
    'sourceVersion', 1
  ),
  '{"specialized":true}'::jsonb,
  true
from (
  values
    ('b1010000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 1, 'os-c1-m1', '{"ko":"OS 추상화","vi":"OS Abstraction","en":"OS Abstraction"}'::jsonb, '{"ko":"물리 장치와 OS 추상화 개념을 연결하세요.","vi":"Nối thiết bị vật lý với OS abstraction.","en":"Match physical devices to OS abstractions."}'::jsonb, 'Codex access', 25),
    ('b1010000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 2, 'os-c1-m2', '{"ko":"CPU 스케줄링","vi":"CPU Scheduling","en":"CPU Scheduling"}'::jsonb, '{"ko":"SJF로 프로세스 실행 순서를 결정하세요.","vi":"Sắp xếp tiến trình bằng SJF.","en":"Order processes using SJF."}'::jsonb, 'Voucher', 30),
    ('b1010000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 3, 'os-c1-m3', '{"ko":"메모리 페이징","vi":"Memory Paging","en":"Memory Paging"}'::jsonb, '{"ko":"Page Table을 사용해 Frame을 찾으세요.","vi":"Tìm Frame bằng Page Table.","en":"Find frames using a page table."}'::jsonb, 'Lab access card', 35),
    ('b1010000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000001'::uuid, 4, 'os-c1-m4', '{"ko":"디스크 스케줄링","vi":"Disk Scheduling","en":"Disk Scheduling"}'::jsonb, '{"ko":"SSTF로 디스크 요청을 처리하세요.","vi":"Xử lý yêu cầu đĩa bằng SSTF.","en":"Handle disk requests using SSTF."}'::jsonb, 'Chapter 01 Clear', 40),
    ('b1020000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 1, 'os-c2-m1', '{"ko":"논문 구조 순서 맞추기","vi":"Sắp xếp cấu trúc paper","en":"Order the paper structure"}'::jsonb, '{"ko":"주요 section을 실제 순서로 배치하세요.","vi":"Sắp xếp các section theo đúng thứ tự.","en":"Arrange the major sections in their actual order."}'::jsonb, 'Paper Skill I', 30),
    ('b1020000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 2, 'os-c2-m2', '{"ko":"Abstract 핵심 찾기","vi":"Tìm ý chính trong Abstract","en":"Find the key ideas in the abstract"}'::jsonb, '{"ko":"Abstract의 흐름과 핵심 기술을 찾으세요.","vi":"Tìm luồng và kỹ thuật chính trong Abstract.","en":"Find the flow and core techniques in the abstract."}'::jsonb, 'Paper Skill II', 30),
    ('b1020000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 3, 'os-c2-m3', '{"ko":"Figure 먼저 읽기","vi":"Đọc Figure trước","en":"Read the figures first"}'::jsonb, '{"ko":"Figure를 통해 연구 흐름을 파악하세요.","vi":"Hiểu luồng nghiên cứu qua Figure.","en":"Understand the research flow through its figures."}'::jsonb, 'Paper Skill III', 30),
    ('b1020000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000002'::uuid, 4, 'os-c2-m4', '{"ko":"한 문장으로 요약하기","vi":"Tóm tắt trong một câu","en":"Summarize in one sentence"}'::jsonb, '{"ko":"논문의 핵심을 한 문장으로 정리하세요.","vi":"Tóm tắt ý chính của paper trong một câu.","en":"Summarize the paper''s main idea in one sentence."}'::jsonb, 'Chapter 02 Clear', 40),
    ('b1030000-0000-4000-8000-000000000001'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, 1, 'os-c3-m1', '{"ko":"연결 리스트 출력","vi":"Linked List Output","en":"Linked List Output"}'::jsonb, '{"ko":"malloc으로 생성된 linked list의 출력을 추적하세요.","vi":"Theo dõi output của linked list tạo bằng malloc.","en":"Trace the output of a linked list created with malloc."}'::jsonb, 'Source Module', 35),
    ('b1030000-0000-4000-8000-000000000002'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, 2, 'os-c3-m2', '{"ko":"식사하는 철학자","vi":"Dining Philosophers","en":"Dining Philosophers"}'::jsonb, '{"ko":"semaphore 함수와 philosopher loop를 완성하세요.","vi":"Hoàn thành semaphore functions và philosopher loop.","en":"Complete the semaphore functions and philosopher loop."}'::jsonb, 'Sync Core', 40),
    ('b1030000-0000-4000-8000-000000000003'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, 3, 'os-c3-m3', '{"ko":"방향 그래프 탐색","vi":"Directed Graph Search","en":"Directed Graph Search"}'::jsonb, '{"ko":"DFS와 backtracking으로 S에서 G를 탐색하세요.","vi":"Dùng DFS và backtracking để đi từ S đến G.","en":"Use DFS and backtracking to search from S to G."}'::jsonb, 'Route Map', 40),
    ('b1030000-0000-4000-8000-000000000004'::uuid, 'a1000000-0000-4000-8000-000000000003'::uuid, 4, 'os-c3-m4', '{"ko":"JOIN 디버거","vi":"JOIN Debugger","en":"JOIN Debugger"}'::jsonb, '{"ko":"ambiguous column 오류가 있는 SQL을 수정하세요.","vi":"Sửa SQL gây lỗi ambiguous column.","en":"Fix SQL that causes an ambiguous-column error."}'::jsonb, 'Project Key', 50)
) as seed(id, chapter_id, mission_number, game_key, title_i18n, instructions_i18n, reward_label, reward_points)
where exists (
  select 1 from public.quest_chapters
  where id = seed.chapter_id
)
on conflict (id) do update
set source_key = excluded.source_key,
    title_i18n = excluded.title_i18n,
    instructions_i18n = excluded.instructions_i18n,
    content = excluded.content,
    validation = excluded.validation,
    active = true;
