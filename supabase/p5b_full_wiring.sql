-- PAWS — P5b final: full permissions matrix wiring
-- 1. Add can_delete_projects column (idempotent; just uses existing permissions jsonb)
-- 2. Add RLS for invites (currently owner-only)
-- 3. Add RLS for site_content that respects can_edit_site_content
-- 4. Add DELETE policy for projects that requires can_delete_projects

-- === 1. INVITES (was owner-only) ===
drop policy if exists "owner_manage_invites" on public.invites;
drop policy if exists "authed_manage_invites" on public.invites;
drop policy if exists "member_redeem_invite" on public.invites;
drop policy if exists "member_redeem_invite_v2" on public.invites;

-- Owner can do anything
create policy "owner_all_invites"
  on public.invites for all to authenticated
  using ( public.is_owner() or public.has_perm('can_invite') )
  with check ( public.is_owner() or public.has_perm('can_invite') );

-- Anon (public) can look up a code to verify before signup
create policy "anon_select_invites_by_code"
  on public.invites for select
  to anon, authenticated
  using ( true );

-- Authed user can mark an unredeemed invite as redeemed
create policy "member_redeem_invite"
  on public.invites for update to authenticated
  using ( redeemed_at is null )
  with check ( redeemed_at is not null and member_id = auth.uid() );

-- === 2. SITE_CONTENT (now can_edit_site_content works) ===
-- (existing policies already check is_owner; update to include has_perm)
drop policy if exists "owner_all_site_content" on public.site_content;
create policy "writer_all_site_content"
  on public.site_content for all to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_site_content') )
  with check ( public.is_owner() or public.has_perm('can_edit_site_content') );

-- === 3. PROJECTS DELETE (separate from edit) ===
-- Existing: writer_update_projects requires can_edit_projects
-- Add: writer_delete_projects requires can_delete_projects (new, more restrictive)
drop policy if exists "writer_delete_projects" on public.projects;
create policy "writer_delete_projects"
  on public.projects for delete to authenticated
  using ( public.is_owner() or public.has_perm('can_delete_projects') );

-- === 4. MEMBERS (now can_manage_members works for non-owner) ===
-- Existing: owner_all_members is fine (covers is_owner OR can_manage_members if we add it)
-- Replace with broader writer check:
drop policy if exists "owner_all_members" on public.members;
create policy "owner_or_manager_all_members"
  on public.members for all to authenticated
  using ( public.is_owner() or public.has_perm('can_manage_members') )
  with check ( public.is_owner() or public.has_perm('can_manage_members') );

-- === 5. members UPDATE self can set self_publish if can_publish granted ===
-- Replace existing member_update_self with one that also allows setting published if can_publish=true
drop policy if exists "member_update_self" on public.members;
create policy "member_update_self"
  on public.members for update to authenticated
  using ( id = auth.uid() )
  with check (
    id = auth.uid()
    and is_owner = (select is_owner from public.members where id = auth.uid())  -- can't self-promote
    and member_visible = true
    -- can flip published ONLY if self-publish permission granted
    and ( published = (select published from public.members where id = auth.uid())
          or public.has_perm('can_publish') )
  );
