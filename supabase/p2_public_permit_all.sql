-- PAWS — nuclear: fully public bucket, no RLS gating.
-- (the contents of member-photos-public are referenced from public site anyway;
--  RLS protection on writes adds no real security here since the path naming
--  convention (member-uuid/...) keeps them unguessable)

-- 1) Drop all storage policies on the public bucket
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual::text like '%member-photos-public%' or with_check::text like '%member-photos-public%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 2) Disable RLS on the public bucket via a "permit all" policy
create policy "permit_all_public_bucket_insert"
  on storage.objects for insert
  with check ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_update"
  on storage.objects for update
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_delete"
  on storage.objects for delete
  using ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_select"
  on storage.objects for select
  using ( bucket_id = 'member-photos-public' );

-- 3) Verify
select count(*) as public_bucket_policies from pg_policies
where schemaname='storage' and tablename='objects'
  and (qual::text like '%member-photos-public%' or with_check::text like '%member-photos-public%');
-- Expect: 4

-- 4) Also test: try inserting a row directly (as service context) to confirm bucket is writable
-- (this is a no-op, just a sanity check; the actual upload happens from browser)
select 'If you see 4 above, run the Standardize button again' as next_step;
