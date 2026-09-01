-- ============================================================================
-- P2 — Storage RLS fix v2 (owner needs to READ raw photos to standardize them)
-- Re-runnable: drops and recreates the policies.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

-- Drop all existing storage policies on these buckets
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Redefine is_owner() defensively
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  );
$$;

-- === member-photos (PRIVATE) ===
-- Members manage their own folder
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

-- Owner can do EVERYTHING in member-photos (read all, write all, delete all)
create policy "owner_all_private_photos"
  on storage.objects for all to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- === member-photos-public (PUBLIC bucket — anon read is implicit) ===
-- Owner writes/updates/deletes
create policy "owner_insert_public_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos-public' and public.is_owner()
  );

create policy "owner_update_public_photo"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() )
  with check ( bucket_id = 'member-photos-public' and public.is_owner() );

create policy "owner_delete_public_photo"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() );

-- Verify (expect ~7 policies):
-- select policyname, cmd from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (policyname ilike '%photo%' or policyname ilike '%public_photo%' or policyname ilike '%private_photo%')
-- order by policyname;
