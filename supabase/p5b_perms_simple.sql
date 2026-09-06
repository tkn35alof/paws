-- PAWS — P5b permissions: simple explicit policies
-- Drop and recreate policies for each table we care about.

-- Members table
drop policy if exists "public_read_published_members" on public.members;
create policy "public_read_published_members"
  on public.members for select
  using ( published = true );

drop policy if exists "auth_read_all_members" on public.members;
create policy "auth_read_all_members"
  on public.members for select to authenticated
  using ( true );

drop policy if exists "writer_update_members" on public.members;
create policy "writer_update_members"
  on public.members for update to authenticated
  using ( public.is_owner() or public.has_perm('can_manage_members') )
  with check ( public.is_owner() or public.has_perm('can_manage_members') );

drop policy if exists "writer_insert_members" on public.members;
create policy "writer_insert_members"
  on public.members for insert to authenticated
  with check ( public.is_owner() );

drop policy if exists "writer_delete_members" on public.members;
create policy "writer_delete_members"
  on public.members for delete to authenticated
  using ( public.is_owner() );

-- Invites table
drop policy if exists "auth_read_all_invites" on public.invites;
create policy "auth_read_all_invites"
  on public.invites for select to authenticated
  using ( true );

drop policy if exists "writer_insert_invites" on public.invites;
create policy "writer_insert_invites"
  on public.invites for insert to authenticated
  with check ( public.is_owner() or public.has_perm('can_invite') );

drop policy if exists "writer_delete_invites" on public.invites;
create policy "writer_delete_invites"
  on public.invites for delete to authenticated
  using ( public.is_owner() or public.has_perm('can_invite') );

drop policy if exists "writer_update_invites" on public.invites;
create policy "writer_update_invites"
  on public.invites for update to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- Site content table
drop policy if exists "public_read_site_content" on public.site_content;
create policy "public_read_site_content"
  on public.site_content for select
  using ( true );

drop policy if exists "writer_site_content" on public.site_content;
create policy "writer_site_content"
  on public.site_content for all to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_site_content') )
  with check ( public.is_owner() or public.has_perm('can_edit_site_content') );

-- Projects table (ensure we have the correct ones)
drop policy if exists "public_read_published_projects" on public.projects;
create policy "public_read_published_projects"
  on public.projects for select
  using ( published = true );

drop policy if exists "auth_read_all_projects" on public.projects;
create policy "auth_read_all_projects"
  on public.projects for select to authenticated
  using ( true );

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

-- Testimonials table
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

-- Ensure helper functions exist (they should from earlier)
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