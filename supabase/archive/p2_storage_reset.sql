-- PAWS — hard reset of all storage policies (final fix for P2).
-- Drops every policy on storage.objects related to member-photos*, then
-- recreates a clean minimal set.

do $$
declare
  p record;
begin
  -- Aggressively drop ALL storage policies matching the bucket names.
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (
        qual like '%member-photos%'
        or with_check like '%member-photos%'
        or policyname like '%photo%'
        or policyname like '%member_insert%'
        or policyname like '%member_update%'
        or policyname like '%member_select%'
        or policyname like '%owner_insert%'
        or policyname like '%owner_update%'
        or policyname like '%owner_delete%'
        or policyname like '%owner_all%'
        or policyname like '%authed%'
        or policyname like '%public_photo%'
        or policyname like '%private_photo%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Verify nothing left
select count(*) as remaining_policies from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (qual like '%member-photos%' or with_check like '%member-photos%');

-- === Clean recreate ===

-- Private bucket (member-photos): members can manage their own folder
create policy "p1_member_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "p2_member_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "p3_member_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private bucket: owner can also access (for standardize download)
-- This is the missing piece — owner bypasses foldername check.
create policy "p4_owner_select_private"
  on storage.objects for select to authenticated
  using ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ));

create policy "p5_owner_update_private"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ))
  with check ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ));

-- Public bucket (member-photos-public): any authed user can write (Option A)
create policy "p6_authed_insert_public"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'member-photos-public' );

create policy "p7_authed_update_public"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "p8_authed_delete_public"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' );

-- Verify (expect 8 policies):
-- select count(*) as policies from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');
