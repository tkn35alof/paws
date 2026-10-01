-- ============================================================================
-- PAWS — RLS policy for site_content (testimonial_marquee_delays)
-- Run in Supabase SQL Editor
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

-- ---- SITE_CONTENT ----
-- Non-owner with can_edit_testimonials: can update testimonial_marquee_delays key
drop policy if exists "editor_testimonial_marquee_delays" on public.site_content;
create policy "editor_testimonial_marquee_delays"
  on public.site_content for update
  to authenticated
  using (
    key = 'testimonial_marquee_delays'
    and public.has_permission('can_edit_testimonials')
  )
  with check (
    key = 'testimonial_marquee_delays'
    and public.has_permission('can_edit_testimonials')
  );

-- Also allow insert (in case key doesn't exist)
drop policy if exists "editor_insert_testimonial_marquee_delays" on public.site_content;
create policy "editor_insert_testimonial_marquee_delays"
  on public.site_content for insert
  to authenticated
  with check (
    key = 'testimonial_marquee_delays'
    and public.has_permission('can_edit_testimonials')
  );