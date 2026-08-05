-- Let every authenticated lab member contribute papers and request AI quizzes.
-- Lab administration actions (editing, deleting, and Quest linking) stay admin-only.

drop policy if exists "Lab admins can create papers" on public.lab_papers;
drop policy if exists "Lab members can create papers" on public.lab_papers;
create policy "Lab members can create papers"
  on public.lab_papers for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.is_lab_member(lab_id)
      or public.is_lab_admin(lab_id)
    )
  );

drop policy if exists "Paper members can upload PDFs" on storage.objects;
create policy "Paper members can upload PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'paper-files'
    and lower(name) like '%.pdf'
    and coalesce((metadata ->> 'size')::bigint, 0) <= 20971520
    and ((storage.foldername(name))[2]) = (select auth.uid())::text
    and (
      public.is_lab_member(((storage.foldername(name))[1])::uuid)
      or public.is_lab_admin(((storage.foldername(name))[1])::uuid)
    )
  );

drop policy if exists "Lab admins can request paper questions"
  on public.paper_question_jobs;
drop policy if exists "Lab members can request paper questions"
  on public.paper_question_jobs;
create policy "Lab members can request paper questions"
  on public.paper_question_jobs for insert to authenticated
  with check (
    requested_by = (select auth.uid())
    and status = 'queued'
    and attempt_count = 0
    and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id
        and (
          public.is_lab_member(paper.lab_id)
          or public.is_lab_admin(paper.lab_id)
        )
    )
  );
