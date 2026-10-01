-- ============================================================================
-- PAWS — RLS policies for non-owner permissions (logos + features)
-- Run in Supabase SQL Editor after migration_logos_features.sql
-- ============================================================================

-- Helper: check if current user has a specific permission
create or replace function public.has_permission(perm text) returns boolean
language sql stable security definer as $$
  select coalesce(
    (permissions->>perm)::boolean,
    false
  )
  from public.members
  where id = auth.uid();
$$;

-- ---- INTEGRATION_LOGOS ----
-- Non-owner with can_edit_logos: full CRUD
drop policy if exists "editor_all_integration_logos" on public.integration_logos;
create policy "editor_all_integration_logos"
  on public.integration_logos for all
  to authenticated
  using ( public.has_permission('can_edit_logos') )
  with check ( public.has_permission('can_edit_logos') );

-- ---- FEATURES ----
-- Non-owner with can_edit_features: full CRUD
drop policy if exists "editor_all_features" on public.features;
create policy "editor_all_features"
  on public.features for all
  to authenticated
  using ( public.has_permission('can_edit_features') )
  with check ( public.has_permission('can_edit_features') );