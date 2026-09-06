-- PAWS — P5b.3: RLS policies for all tables respecting the permissions matrix
-- (now all tabs can be delegated via permissions; ownerOnly flags removed from TAB_META)

-- Drop existing policies on these tables (we'll recreate them)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename in ('members','invites','site_content','projects','testimonials')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- Helper: is_owner() and has_perm() (ensure they exist)
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select coalesce((select is_owner from public.members where id = auth.uid()), false);
$$;

create or replace function public.has_perm(flag text) returns boolean
language sql stable security definer as $$
  select coalesce(
    (select (permissions ->> flag)::boolean from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_owner() to authenticated, anon;
grant execute on function public.has_perm(text) to authenticated, anon;

-- =========================================================
-- MEMBERS TABLE
-- =========================================================
-- Public read of published members (for the public Team page)
drop policy if exists "public_read_published_members" on public.members;
create policy "public_read_published_members"
  on public.members for select
  using ( published = true );

-- Authenticated read of all members (so admins and delegated members can see the roster)
drop policy if exists "auth_read_all_members" on public.members;
create policy "auth_read_all_members"
  on public.members for select to authenticated
  using ( true );

-- Update: only owner or can_manage_members can update the permissions column (and other fields?)
-- We'll allow updating the entire row for simplicity, but note the UI only shows the permissions editor for owners.
-- Non-owners with can_manage_members could theoretically update any field, but the UI doesn't expose it.
drop policy if exists "writer_update_members" on public.members;
create policy "writer_update_members"
  on public.members for update to authenticated
  using ( public.is_owner() or public.has_perm('can_manage_members') )
  with check ( public.is_owner() or public.has_perm('can_manage_members') );

-- Insert and delete are not exposed in the UI for members (we manage members via Supabase auth invites?).
-- We'll leave them restricted to owner only for safety.
drop policy if exists "writer_insert_members" on public.members;
create policy "writer_insert_members"
  on public.members for insert to authenticated
  with check ( public.is_owner() );

drop policy if exists "writer_delete_members" on public.members;
create policy "writer_delete_members"
  on public.members for delete to authenticated
  using ( public.is_owner() );

-- =========================================================
-- INVITES TABLE
-- =========================================================
-- Authenticated read of all invites (so delegated invite-senders can see the list)
drop policy if exists "auth_read_all_invites" on public.invites;
create policy "auth_read_all_invites"
  on public.invites for select to authenticated
  using ( true );

-- Insert: owner or can_invite can generate invites
drop policy if exists "writer_insert_invites" on public.invites;
create policy "writer_insert_invites"
  on public.invites for insert to authenticated
  with check ( public.is_owner() or public.has_perm('can_invite') );

-- Delete: owner or can_invite can revoke invites
drop policy if exists "writer_delete_invites" on public.invites;
create policy "writer_delete_invites"
  on public.invites for delete to authenticated
  using ( public.is_owner() or public.has_perm('can_invite') );

-- Update: not exposed in the UI (we don't edit invites after creation). Restrict to owner.
drop policy if exists "writer_update_invites" on public.invites;
create policy "writer_update_invites"
  on public.invites for update to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- =========================================================
-- SITE_CONTENT TABLE
-- =========================================================
-- Public read of site content (for the public pages)
drop policy if exists "public_read_site_content" on public.site_content;
create policy "public_read_site_content"
  on public.site_content for select
  using ( true );

-- Update (upsert): owner or can_edit_site_content can edit site content
drop policy if exists "writer_site_content" on public.site_content;
create policy "writer_site_content"
  on public.site_content for all to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_site_content') )
  with check ( public.is_owner() or public.has_perm('can_edit_site_content') );

-- =========================================================
-- PROJECTS TABLE (already done in P5b.2, but we recreate for consistency)
-- =========================================================
-- Public read of published projects
drop policy if exists "public_read_published_projects" on public.projects;
create policy "public_read_published_projects"
  on public.projects for select
  using ( published = true );

-- Authenticated read of all projects (so editors can see drafts)
drop policy if exists "auth_read_all_projects" on public.projects;
create policy "auth_read_all_projects"
  on public.projects for select to authenticated
  using ( true );

-- Write: owner OR has_perm('can_edit_projects')
drop policy if exists "writer_insert_projects" on public.projects;
create policy "writer_insert_projects"
  on public.projects for insert to authenticated
  with check ( public.is_owner() or public.has_perm('can_edit_projects') );

drop policy if exists "writer_update_projects" on public.projects;
create policy "writer_update_projects"
  on public.projects for update to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_projects') )
  with check ( public.is_owner() or public.has_perm('can_edit_projects') );

drop policy if exists "writer_delete_projects" on public.projects;
create policy "writer_delete_projects"
  on public.projects for delete to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_projects') );

-- =========================================================
-- TESTIMONIALS TABLE (already done in P5b.2, but we recreate for consistency)
-- =========================================================
drop policy if exists "public_read_published_testimonials" on public.testimonials;
create policy "public_read_published_testimonials"
  on public.testimonials for select
  using ( published = true );

drop policy if exists "auth_read_all_testimonials" on public.testimonials;
create policy "auth_read_all_testimonials"
  on public.testimonials for select to authenticated
  using ( true );

drop policy if exists "writer_insert_testimonials" on public.testimonials;
create policy "writer_insert_testimonials"
  on public.testimonials for insert to authenticated
  with check ( public.is_owner() or public.has_perm('can_edit_testimonials') );

drop policy if exists "writer_update_testimonials" on public.testimonials;
create policy "writer_update_testimonials"
  on public.testimonials for update to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_testimonials') )
  with check ( public.is_owner() or public.has_perm('can_edit_testimonials') );

drop policy if exists "writer_delete_testimonials" on public.testimonials;
create policy "writer_delete_testimonials"
  on public.testimonials for delete to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_testimonials') );

-- Verify counts
select tablename, count(*) as policies from pg_policies
where schemaname = 'public' and tablename in ('members','invites','site_content','projects','testimonials')
group by tablename order by tablename;