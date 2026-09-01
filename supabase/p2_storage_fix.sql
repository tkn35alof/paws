-- ============================================================================
-- P2 — Storage RLS fix
-- Run this in Supabase SQL Editor (re-runnable, drops + recreates).
-- ============================================================================

-- Re-confirm the two buckets exist
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

-- Drop ALL existing policies on storage.objects for these two buckets so
-- the script is fully re-runnable.
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

-- Helper to read the current auth user's owner flag without RLS recursion
-- (this is the same function defined in schema.sql; redefine as OR replace so
-- this file is self-contained)
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  );
$$;

-- --- member-photos (PRIVATE) ------------------------------------------------
-- Members can upload/update/read their own folder (foldername[1] == auth.uid()).
create policy "member_insert_own_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- --- member-photos-public (PUBLIC) ------------------------------------------
-- The bucket is public (read by anon via the public URL). Owner writes.
create policy "owner_insert_public_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

create policy "owner_update_public_photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  )
  with check (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

create policy "owner_delete_public_photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

-- Anon/public read of the public bucket is implicit (bucket is public).
-- No policy needed for anon SELECT on the public bucket.

-- Verify (should show 6 policies on storage.objects for member-photos-*):
-- select policyname, cmd from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and (policyname like '%photo%' or policyname like '%public_photo%')
-- order by policyname;
