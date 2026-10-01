-- PAWS — storage RLS v4: inline owner check (no helper function).
-- The is_owner() function may not behave correctly under storage RLS
-- (likely a recursion/permission edge case in Supabase's storage RLS
-- evaluation). This version inlines the owner check directly.

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- === member-photos (PRIVATE) ===
-- Member: own folder only
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

-- Owner: full access via inline check (no function call).
-- IMPORTANT: this uses auth.uid() against the members table directly.
-- For this to work, the members table needs a SELECT policy that allows
-- reading your own row, which we already have (member_read_self).
create policy "owner_select_private_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_insert_private_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_update_private_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  )
  with check (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_delete_private_photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

-- === member-photos-public (PUBLIC bucket) ===
create policy "owner_insert_public_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_update_public_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  )
  with check (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_delete_public_photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

-- Verify (expect ~10 policies):
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');
