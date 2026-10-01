-- PAWS — P3a RLS additions: invite lookup + member-creation on signup
-- Run in Supabase SQL Editor.

-- Allow anon (unauthenticated) users to look up an invite by code, so they
-- can verify before signing up. (We only allow SELECT; INSERT/UPDATE/DELETE
-- remain owner-only.)
drop policy if exists "anon_select_invites_by_code" on public.invites;
create policy "anon_select_invites_by_code"
  on public.invites for select
  to anon, authenticated
  using ( true );

-- Allow a freshly-signed-up user to insert their own members row.
-- The members table currently has policies:
--   - public_read_published_members  (anon/authenticated SELECT where published)
--   - member_read_self               (authed SELECT where id=auth.uid())
--   - member_update_self             (authed UPDATE where id=auth.uid())
--   - owner_all_members              (owner ALL)
-- We need an INSERT policy for the new signup flow: a user can insert their
-- own members row with id = auth.uid() AND is_owner = false AND member_visible
-- = true AND published = false (these are forced values; owner can change them later).
drop policy if exists "member_insert_self" on public.members;
create policy "member_insert_self"
  on public.members for insert
  to authenticated
  with check (
    id = auth.uid()
    and is_owner = false
    and member_visible = true
    and published = false
  );

-- Allow a freshly-signed-up user to mark their own invite as redeemed.
-- The current policy "member_redeem_invite" allows UPDATE when
-- redeemed_at is null and sets redeemed_at not null. That should work for the
-- new user (auth.uid() matches the invite's member_id after we set it). But
-- we also need the user to be able to set member_id to their own id.
-- Add a permissive policy for that specific case.
drop policy if exists "member_redeem_invite_v2" on public.invites;
create policy "member_redeem_invite_v2"
  on public.invites for update
  to authenticated
  using ( redeemed_at is null )
  with check ( redeemed_at is not null and member_id = auth.uid() );

-- Verify (expect ~5 policies on invites, 5 on members):
-- select tablename, count(*) from pg_policies
-- where schemaname='public' and tablename in ('invites','members')
-- group by tablename order by tablename;
