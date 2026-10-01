-- PAWS — P3b.3: permissions column on members.
-- A JSONB column holding capability flags. Default '{}' = no extra perms.
-- Owner always has all perms regardless of this column (enforced in RLS).
-- Per-flag semantics (v1):
--   can_edit_projects      — can create/edit projects in /admin (Projects tab)
--   can_edit_testimonials  — can create/edit testimonials in /admin
--   can_publish            — can publish their own profile (otherwise owner-only)
--   can_invite             — can create invite codes (otherwise owner-only)
--   can_edit_site_content  — can edit About/Mission/Vision/Contact
--   can_manage_members     — owner-level control over other members
alter table public.members
  add column if not exists permissions jsonb default '{}'::jsonb;
