-- PAWS — P5b.2: RLS policies that respect the permissions matrix
-- (previously only owner could write; now delegated members with the right
-- permission flag can edit their assigned sections).

-- Drop existing owner-only policies on these tables (they only checked is_owner).
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename in ('projects','testimonials','site_content')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, 'projects');
    execute format('drop policy if exists %I on public.%I', p.policyname, 'testimonials');
    execute format('drop policy if exists %I on public.%I', p.policyname, 'site_content');
  end loop;
end $$;

-- Make sure is_owner() is defined
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select coalesce((select is_owner from public.members where id = auth.uid()), false);
$$;

-- Helper: does the current user have a specific permission flag?
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
-- PROJECTS
-- =========================================================
-- Public read of published
drop policy if exists "public_read_published_projects" on public.projects;
create policy "public_read_published_projects"
  on public.projects for select
  using ( published = true );

-- Authenticated read of all (so editors can see drafts)
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
-- TESTIMONIALS
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

-- =========================================================
-- SITE_CONTENT (still owner-only by design — content sets the brand voice)
-- =========================================================
drop policy if exists "public_read_site_content" on public.site_content;
create policy "public_read_site_content"
  on public.site_content for select
  using ( true );

drop policy if exists "owner_all_site_content" on public.site_content;
create policy "owner_all_site_content"
  on public.site_content for all to authenticated
  using ( public.is_owner() or public.has_perm('can_edit_site_content') )
  with check ( public.is_owner() or public.has_perm('can_edit_site_content') );

-- Verify counts
select tablename, count(*) as policies from pg_policies
where schemaname = 'public' and tablename in ('projects','testimonials','site_content')
group by tablename order by tablename;
