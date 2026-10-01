-- ============================================================================
-- PAWS Phase 1: Avatar Pipeline — schema extensions + storage bucket
-- Run this in the Supabase SQL editor (or via supabase CLI).
-- ============================================================================

-- 1. Extend members table with avatar pipeline columns
alter table public.members
  add column if not exists superiority_rank      integer default 99,   -- lower = higher role
  add column if not exists generated_avatar_url text,                    -- URL to generated 3D model / render
  add column if not exists sync_avatar_on_update boolean default true;    -- toggle: fire generation on photo save?

-- Index for rank-ordered homepage queries
create index if not exists members_rank_idx on public.members (superiority_rank);

-- 2. Avatars storage bucket (public, for 3D model files + renders)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- 3. RLS: members can read their own generated avatar URL
--    (already covered by member_read_self policy which selects all columns)
--    Owner can read/update all via owner_all_members policy (already covers all columns)

-- 4. Storage RLS for avatars bucket
--    Service-role uploads (edge function) bypass RLS automatically.
--    Public reads: the bucket is public, so no policy needed for SELECT.
--    Authenticated members may read their own avatar files.

drop policy if exists "member_read_own_avatars" on storage.objects;
create policy "member_read_own_avatars"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can manage all avatar files
drop policy if exists "owner_manage_avatars" on storage.objects;
create policy "owner_manage_avatars"
  on storage.objects for all
  to authenticated
  using ( bucket_id = 'avatars' and public.is_owner() )
  with check ( bucket_id = 'avatars' and public.is_owner() );