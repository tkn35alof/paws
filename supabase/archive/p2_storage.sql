-- ============================================================================
-- P2 — Member photo upload (Storage bucket + RLS)
-- Run this in Supabase SQL Editor.
-- ============================================================================

-- Private bucket for member photos. Owner generates public URLs for the
-- standardized (photo_std) version per-member. Members can write to their own
-- folder; owner can read/write everything.
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;

-- Drop existing storage policies on this bucket so this script is re-runnable.
drop policy if exists "member_upload_own_photo"  on storage.objects;
drop policy if exists "member_update_own_photo" on storage.objects;
drop policy if exists "member_read_own_photo"   on storage.objects;
drop policy if exists "owner_manage_photos"     on storage.objects;
drop policy if exists "owner_read_all_photos"   on storage.objects;

-- Members can upload/update/read their own photo (folder == their auth.uid()).
create policy "member_upload_own_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "member_update_own_photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "member_read_own_photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can manage all photos in this bucket.
create policy "owner_manage_photos"
  on storage.objects for all
  to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- Public read of photo_std (the standardized version) via signed URLs is the
-- recommended path. For v1 we make ONLY the photo_std/* path public-readable
-- so the public site can fetch it without a token.
-- (Implementation: a separate 'public' bucket is simpler than per-path RLS;
-- we will use a different approach: store the standardized photo in a public
-- bucket called 'member-photos-public'. See follow-up insert below.)

insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

drop policy if exists "owner_write_public_photos" on storage.objects;
create policy "owner_write_public_photos"
  on storage.objects for insert
  to authenticated
  with check ( bucket_id = 'member-photos-public' and public.is_owner() );

create policy "owner_update_public_photos"
  on storage.objects for update
  to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() )
  with check ( bucket_id = 'member-photos-public' and public.is_owner() );

-- Public can read all objects in the public bucket (bucket is already public).
