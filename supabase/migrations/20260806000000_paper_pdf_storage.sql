insert into storage.buckets (id, name, public)
values ('paper-files', 'paper-files', true)
on conflict (id) do update set public = true;

drop policy if exists "Paper members can upload PDFs" on storage.objects;
create policy "Paper members can upload PDFs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'paper-files'
  and lower(name) like '%.pdf'
  and coalesce((metadata ->> 'size')::bigint, 0) <= 20971520
  and public.is_lab_admin(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Paper files are publicly readable" on storage.objects;
create policy "Paper files are publicly readable"
on storage.objects for select to public
using (bucket_id = 'paper-files');
