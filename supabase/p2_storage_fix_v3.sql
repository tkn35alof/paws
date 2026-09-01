-- PAWS — storage RLS using inline owner check (avoids function/RLS issues)
-- Re-runnable: drops all storage policies on member-photos* first.

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

-- Drop + redefine is_owner() as SECURITY DEFINER (definer = postgres) so it
-- bypasses RLS on public.members and reliably returns whether auth.uid() is
-- the owner. This is the canonical Supabase pattern.
drop function if exists public.is_owner();
create function public.is_owner() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_owner from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_owner() to authenticated, anon;

-- === member-photos (PRIVATE) ===
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

-- Owner does everything in private bucket (downloads, uploads, deletes)
create policy "owner_all_private_photos"
  on storage.objects for all to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- === member-photos-public (PUBLIC) ===
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

-- Verify:
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');
-- Expect ~7 policies.
