-- The database is shared by production main and feature previews. Keep the
-- legacy progress writes available until the new quiz UI reaches production,
-- so the old production control does not fail during the preview period.

drop policy if exists "Members can create their paper progress"
  on public.paper_progress;
create policy "Members can create their paper progress"
  on public.paper_progress for insert to authenticated
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

drop policy if exists "Members can update their paper progress"
  on public.paper_progress;
create policy "Members can update their paper progress"
  on public.paper_progress for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid()) and exists (
      select 1 from public.lab_papers as paper
      where paper.id = paper_id and public.is_lab_member(paper.lab_id)
    )
  );

grant insert, update, delete on public.paper_progress to authenticated;
