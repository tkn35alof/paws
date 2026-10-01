-- PAWS — Option A: relax public-bucket policies so any authed user can write.
-- (members still can't reference their own photo_std on the public site —
--  only the owner controls the photo_std field on the members row.)

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like '%public_photo%' or policyname like '%private_photo%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Public bucket: any authenticated user can read + write + delete
-- (it's a public bucket; the contents are read by anon via public URLs anyway)
create policy "authed_write_public_photo"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'member-photos-public' );

create policy "authed_update_public_photo"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "authed_delete_public_photo"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' );

-- Private bucket: keep member-only rules
create policy "member_insert_own_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify (expect 6 policies):
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');
