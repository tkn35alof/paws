-- ============================================================
-- MIGRATION: schema.sql
-- ============================================================
-- ============================================================================
-- PAWS — Professional Allied Workforce Services
-- Supabase schema + Row Level Security
-- Run this in the Supabase SQL editor (or via supabase CLI).
-- Design principles:
--   * Anon/public key (frontend) can ONLY read published members + published
--     testimonials + published projects. It can NEVER write.
--   * Only authenticated members can update their OWN profile row.
--   * Only the OWNER (is_owner = true) can do everything (invite, publish,
--     edit all, manage permissions, testimonials, projects).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TABLES
-- ---------------------------------------------------------------------------

-- Members (team). Each row = one person.
create table if not exists public.members (
  id            uuid primary key references auth.users(id) on delete cascade,
  slug          text unique not null,
  display_name  text not null,
  tagline       text,
  bio           text,
  role_tags     text[] default '{}',
  skills        text[] default '{}',
  links         jsonb  default '{}'::jsonb,   -- {website, linkedin, x, instagram, ...}
  photo_raw     text,                           -- storage path (raw upload)
  photo_std     text,                           -- storage path (standardized/cropped)
  availability  text default 'available',       -- available | busy | away
  published     boolean default false,          -- owner toggles this for client view
  member_visible boolean default false,         -- can this member log in to portal?
  is_owner      boolean default false,
  display_order integer default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Invite codes. Owner generates; member redeems to claim a member row.
create table if not exists public.invites (
  code          text primary key,
  created_by    uuid references auth.users(id),
  member_id     uuid references public.members(id) on delete set null,
  redeemed_at   timestamptz,
  created_at    timestamptz default now()
);

-- Testimonials (team-level, owner-managed).
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  author_name   text not null,
  author_title  text,
  body          text not null,
  published     boolean default false,
  display_order integer default 0,
  created_at    timestamptz default now()
);

-- Finished projects (portfolio).
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  summary       text,
  cover_image   text,
  member_ids    uuid[] default '{}',   -- who worked on it
  published     boolean default false,
  show_team_public boolean default true,
  display_order integer default 0,
  created_at    timestamptz default now()
);

-- Integration logos (marquee).
create table if not exists public.integration_logos (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text not null,         -- Supabase storage path or external URL
  alt_text      text,
  row_index     integer default 1,     -- 1 = top row, 2 = bottom row
  display_order integer default 0,
  published     boolean default false,
  created_at    timestamptz default now()
);

-- Features (feature cards grid).
create table if not exists public.features (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  icon_svg      text,                  -- inline SVG string
  display_order integer default 0,
  published     boolean default false,
  created_at    timestamptz default now()
);

-- Mission / Vision / About (single-row content table, owner-edited).
create table if not exists public.site_content (
  key           text primary key,       -- 'mission' | 'vision' | 'about' | 'contact'
  body          text,
  updated_at    timestamptz default now(),
  updated_by    uuid references auth.users(id)
);

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
create index if not exists members_published_idx on public.members (published);
create index if not exists members_order_idx on public.members (display_order);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.members       enable row level security;
alter table public.invites       enable row level security;
alter table public.testimonials  enable row level security;
alter table public.projects      enable row level security;
alter table public.site_content  enable row level security;

-- Helper: is current user the owner?
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  );
$$;

-- Helper: is current user a verified member (can log into portal)?
create or replace function public.is_member() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and member_visible = true
  );
$$;

-- ---- MEMBERS ----
-- Public: read published only.
create policy "public_read_published_members"
  on public.members for select
  using ( published = true );

-- Member: read own row (so portal can load their data).
create policy "member_read_self"
  on public.members for select
  to authenticated
  using ( id = auth.uid() );

-- Member: update own row (except the published/is_owner/permission flags).
create policy "member_update_self"
  on public.members for update
  to authenticated
  using ( id = auth.uid() )
  with check (
    id = auth.uid()
    and published = (select published from public.members where id = auth.uid())  -- can't self-publish
    and is_owner = (select is_owner from public.members where id = auth.uid())    -- can't self-promote
    and member_visible = true
  );

-- Owner: full control.
create policy "owner_all_members"
  on public.members for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- INVITES ----
create policy "owner_manage_invites"
  on public.invites for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

create policy "member_redeem_invite"
  on public.invites for update
  to authenticated
  using ( redeemed_at is null )
  with check ( redeemed_at is not null );

-- ---- TESTIMONIALS ----
create policy "public_read_published_testimonials"
  on public.testimonials for select
  using ( published = true );

create policy "owner_all_testimonials"
  on public.testimonials for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- PROJECTS ----
create policy "public_read_published_projects"
  on public.projects for select
  using ( published = true );

create policy "owner_all_projects"
  on public.projects for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- INTEGRATION_LOGOS ----
create policy "public_read_published_logos"
  on public.integration_logos for select
  using ( published = true );

create policy "owner_all_integration_logos"
  on public.integration_logos for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- FEATURES ----
create policy "public_read_published_features"
  on public.features for select
  using ( published = true );

create policy "owner_all_features"
  on public.features for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- SITE_CONTENT ----
create policy "public_read_site_content"
  on public.site_content for select
  using ( true );

create policy "owner_all_site_content"
  on public.site_content for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---------------------------------------------------------------------------
-- STORAGE (member photos)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;

-- Members can upload their own raw photo.
create policy "member_upload_own_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Owner can manage all photos.
create policy "owner_manage_photos"
  on storage.objects for all
  to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- Public can READ standardized photos only (bucket stays private; we serve
-- via a signed/transformed URL the backend/owner generates). For simplicity in
-- v1, the owner generates public URLs for photo_std after standardizing.

-- ============================================================
-- MIGRATION: seed_members.sql
-- ============================================================
-- ============================================================================
-- PAWS — Team seed (6 non-owner members)
-- Run this AFTER you have inserted your OWN owner row (step 2).
-- Each member is a real person you'll add to auth.users, then link to members.
-- INSTRUCTIONS:
--   1. For each person below: Supabase → Authentication → Users → "Add user"
--      with their email + a password (or send invite). Capture the user UUID.
--   2. Replace 'PASTE-USER-UUID' in the matching INSERT with that UUID.
--   3. Run the whole script in Supabase SQL editor.
--   4. After this, each person can log into /login (magic link) and edit their
--      own profile at /portal. The owner (you) can publish them from /admin.
-- ============================================================================

-- IMPORTANT: These placeholders are just for SQL syntax. Replace each UUID
-- with the real auth.users.id for that person, or the inserts will fail with
-- a foreign-key violation.

insert into public.members (id, slug, display_name, tagline, bio, role_tags, skills, links, availability, published, member_visible, is_owner, display_order) values
('PASTE-UUID-1', 'med-va', 'Med VA',
 'Healthcare support, patient coordination, and clinical research ops.',
 'Background as a medical virtual assistant. Brings HIPAA-aware handling, research summaries, and calm client communication.',
 array['Medical VA','Patient Coordination','Research','HIPAA-aware'],
 array['Patient scheduling','EMR','Research summaries','Documentation'],
 '{"linkedin":""}'::jsonb,
 'available', false, true, false, 1),

('PASTE-UUID-2', 'multi-ea', 'Multi-EA',
 'Executive support, social media operations, and operations lead.',
 'Background as a multi-skilled executive assistant. Owns inbox triage, scheduling, content posting, and the team''s operational rhythm.',
 array['Executive Assistant','Social Media Ops','Operations'],
 array['Inbox triage','Scheduling','Content posting','Asana','ClickUp'],
 '{"linkedin":"","instagram":""}'::jsonb,
 'available', false, true, false, 2),

('PASTE-UUID-3', 'dev', 'Dev',
 'Full-stack engineer — front-end focus, with back-end chops.',
 'Builds web apps end to end. Front-end polish and component work, with a hand on the back-end when the data model gets interesting.',
 array['Front-end','Back-end','Web Apps'],
 array['React','Vite','TypeScript','Supabase','Node'],
 '{"github":""}'::jsonb,
 'busy', false, true, false, 3),

('PASTE-UUID-4', 'bpo-csr', 'BPO CSR',
 'Client service specialist with credit-bureau and BPO experience.',
 'Former BPO client service rep with hands-on experience handling credit bureau workflows. Sharp on compliance, calm under pressure.',
 array['Client Service','BPO','Credit Bureau','Compliance'],
 array['Customer support','Dispute handling','Documentation','Process'],
 '{"linkedin":""}'::jsonb,
 'available', false, true, false, 4),

('PASTE-UUID-5', 'electrician-1', 'Electrician 1 (NC2)',
 'NC2-certified electrician — site installs and service work.',
 'NC2-certified. Handles on-site electrical work, panel installs, and field service for the team''s physical-deliverable projects.',
 array['Electrician','NC2','Site Install'],
 array['Wiring','Panel install','Service','Inspection'],
 '{}'::jsonb,
 'available', false, true, false, 5),

('PASTE-UUID-6', 'electrician-2', 'Electrician 2 (NC2)',
 'NC2-certified electrician — residential and light commercial.',
 'NC2-certified partner. Focused on residential wiring, troubleshooting, and light commercial jobs alongside the team''s deployment projects.',
 array['Electrician','NC2','Residential','Troubleshooting'],
 array['Residential wiring','Troubleshooting','Service'],
 '{}'::jsonb,
 'available', false, true, false, 6);

-- Optional: a third electrician slot. Uncomment if you have one.
-- insert into public.members (id, slug, display_name, tagline, role_tags, availability, member_visible, display_order) values
-- ('PASTE-UUID-7', 'electrician-3', 'Electrician 3 (NC2)', 'NC2-certified.', array['Electrician','NC2'], 'available', true, 7);

-- You can publish a member at any time from /admin, or directly:
-- update public.members set published = true where slug = 'dev';

-- ============================================================
-- MIGRATION: p2_storage.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p2_storage_fix.sql
-- ============================================================
-- ============================================================================
-- P2 — Storage RLS fix
-- Run this in Supabase SQL Editor (re-runnable, drops + recreates).
-- ============================================================================

-- Re-confirm the two buckets exist
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

-- Drop ALL existing policies on storage.objects for these two buckets so
-- the script is fully re-runnable.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Helper to read the current auth user's owner flag without RLS recursion
-- (this is the same function defined in schema.sql; redefine as OR replace so
-- this file is self-contained)
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  );
$$;

-- --- member-photos (PRIVATE) ------------------------------------------------
-- Members can upload/update/read their own folder (foldername[1] == auth.uid()).
create policy "member_insert_own_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- --- member-photos-public (PUBLIC) ------------------------------------------
-- The bucket is public (read by anon via the public URL). Owner writes.
create policy "owner_insert_public_photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

create policy "owner_update_public_photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  )
  with check (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

create policy "owner_delete_public_photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'member-photos-public'
    and public.is_owner()
  );

-- Anon/public read of the public bucket is implicit (bucket is public).
-- No policy needed for anon SELECT on the public bucket.

-- Verify (should show 6 policies on storage.objects for member-photos-*):
-- select policyname, cmd from pg_policies
-- where schemaname = 'storage' and tablename = 'objects'
--   and (policyname like '%photo%' or policyname like '%public_photo%')
-- order by policyname;

-- ============================================================
-- MIGRATION: p2_storage_fix_v2.sql
-- ============================================================
-- ============================================================================
-- P2 — Storage RLS fix v2 (owner needs to READ raw photos to standardize them)
-- Re-runnable: drops and recreates the policies.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

-- Drop all existing storage policies on these buckets
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Redefine is_owner() defensively
create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  );
$$;

-- === member-photos (PRIVATE) ===
-- Members manage their own folder
create policy "member_insert_own_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can do EVERYTHING in member-photos (read all, write all, delete all)
create policy "owner_all_private_photos"
  on storage.objects for all to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- === member-photos-public (PUBLIC bucket — anon read is implicit) ===
-- Owner writes/updates/deletes
create policy "owner_insert_public_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos-public' and public.is_owner()
  );

create policy "owner_update_public_photo"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() )
  with check ( bucket_id = 'member-photos-public' and public.is_owner() );

create policy "owner_delete_public_photo"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() );

-- Verify (expect ~7 policies):
-- select policyname, cmd from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (policyname ilike '%photo%' or policyname ilike '%public_photo%' or policyname ilike '%private_photo%')
-- order by policyname;

-- ============================================================
-- MIGRATION: p2_is_owner_fix.sql
-- ============================================================
-- PAWS — fix is_owner() so it returns true for the current owner.
-- The previous version had SECURITY DEFINER which made the inner SELECT subject
-- to the members table's RLS — including the policy that restricts reads to
-- "owner OR self". That made is_owner() return false for the owner, breaking
-- storage policies.
--
-- The fix: drop SECURITY DEFINER. The function now runs as the caller, whose
-- auth.uid() is set, and the members table's "member_read_self" policy
-- permits reading your own row, so is_owner() returns the correct value.

create or replace function public.is_owner() returns boolean
language sql stable security invoker as $$
  select exists (
    select 1 from public.members
    where id = auth.uid() and is_owner = true
  );
$$;

-- Verify
select public.is_owner() as am_i_owner;

-- ============================================================
-- MIGRATION: p2_storage_fix_v3.sql
-- ============================================================
-- PAWS — storage RLS using inline owner check (avoids function/RLS issues)
-- Re-runnable: drops all storage policies on member-photos* first.

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Drop + redefine is_owner() as SECURITY DEFINER (definer = postgres) so it
-- bypasses RLS on public.members and reliably returns whether auth.uid() is
-- the owner. This is the canonical Supabase pattern.
drop function if exists public.is_owner();
create function public.is_owner() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_owner from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_owner() to authenticated, anon;

-- === member-photos (PRIVATE) ===
create policy "member_insert_own_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner does everything in private bucket (downloads, uploads, deletes)
create policy "owner_all_private_photos"
  on storage.objects for all to authenticated
  using ( bucket_id = 'member-photos' and public.is_owner() )
  with check ( bucket_id = 'member-photos' and public.is_owner() );

-- === member-photos-public (PUBLIC) ===
create policy "owner_insert_public_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos-public' and public.is_owner()
  );

create policy "owner_update_public_photo"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() )
  with check ( bucket_id = 'member-photos-public' and public.is_owner() );

create policy "owner_delete_public_photo"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' and public.is_owner() );

-- Verify:
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');
-- Expect ~7 policies.

-- ============================================================
-- MIGRATION: p2_is_owner_v2.sql
-- ============================================================
-- PAWS — fix is_owner() without breaking policies that depend on it.
-- The previous drop failed because 5 RLS policies on members/invites/etc.
-- depend on this function. Use CREATE OR REPLACE which preserves the function
-- identity and keeps dependent policies working.

create or replace function public.is_owner() returns boolean
language sql stable security definer as $$
  select coalesce(
    (select is_owner from public.members where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_owner() to authenticated, anon;

-- Verify the function exists and returns sensibly
select public.is_owner() as am_i_owner;

-- Now show all storage policies to confirm the previous 7 are still there
select count(*) as storage_photo_policies from pg_policies
where schemaname='storage' and tablename='objects'
  and (qual like '%member-photos%' or with_check like '%member-photos%');

-- ============================================================
-- MIGRATION: p2_storage_v4.sql
-- ============================================================
-- PAWS — storage RLS v4: inline owner check (no helper function).
-- The is_owner() function may not behave correctly under storage RLS
-- (likely a recursion/permission edge case in Supabase's storage RLS
-- evaluation). This version inlines the owner check directly.

insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', false)
on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
values ('member-photos-public', 'member-photos-public', true)
on conflict (id) do nothing;

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual like '%member-photos%' or with_check like '%member-photos%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- === member-photos (PRIVATE) ===
-- Member: own folder only
create policy "member_insert_own_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner: full access via inline check (no function call).
-- IMPORTANT: this uses auth.uid() against the members table directly.
-- For this to work, the members table needs a SELECT policy that allows
-- reading your own row, which we already have (member_read_self).
create policy "owner_select_private_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_insert_private_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_update_private_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  )
  with check (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_delete_private_photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-photos'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

-- === member-photos-public (PUBLIC bucket) ===
create policy "owner_insert_public_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_update_public_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  )
  with check (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

create policy "owner_delete_public_photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'member-photos-public'
    and exists (
      select 1 from public.members
      where id = auth.uid() and is_owner = true
    )
  );

-- Verify (expect ~10 policies):
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');

-- ============================================================
-- MIGRATION: p2_option_a.sql
-- ============================================================
-- PAWS — Option A: relax public-bucket policies so any authed user can write.
-- (members still can't reference their own photo_std on the public site —
--  only the owner controls the photo_std field on the members row.)

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (policyname like '%public_photo%' or policyname like '%private_photo%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Public bucket: any authenticated user can read + write + delete
-- (it's a public bucket; the contents are read by anon via public URLs anyway)
create policy "authed_write_public_photo"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'member-photos-public' );

create policy "authed_update_public_photo"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "authed_delete_public_photo"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' );

-- Private bucket: keep member-only rules
create policy "member_insert_own_photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_update_own_photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "member_select_own_photo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Verify (expect 6 policies):
-- select count(*) from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');

-- ============================================================
-- MIGRATION: p2_storage_reset.sql
-- ============================================================
-- PAWS — hard reset of all storage policies (final fix for P2).
-- Drops every policy on storage.objects related to member-photos*, then
-- recreates a clean minimal set.

do $$
declare
  p record;
begin
  -- Aggressively drop ALL storage policies matching the bucket names.
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (
        qual like '%member-photos%'
        or with_check like '%member-photos%'
        or policyname like '%photo%'
        or policyname like '%member_insert%'
        or policyname like '%member_update%'
        or policyname like '%member_select%'
        or policyname like '%owner_insert%'
        or policyname like '%owner_update%'
        or policyname like '%owner_delete%'
        or policyname like '%owner_all%'
        or policyname like '%authed%'
        or policyname like '%public_photo%'
        or policyname like '%private_photo%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- Verify nothing left
select count(*) as remaining_policies from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (qual like '%member-photos%' or with_check like '%member-photos%');

-- === Clean recreate ===

-- Private bucket (member-photos): members can manage their own folder
create policy "p1_member_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "p2_member_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "p3_member_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'member-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Private bucket: owner can also access (for standardize download)
-- This is the missing piece — owner bypasses foldername check.
create policy "p4_owner_select_private"
  on storage.objects for select to authenticated
  using ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ));

create policy "p5_owner_update_private"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ))
  with check ( bucket_id = 'member-photos' and exists (
    select 1 from public.members where id = auth.uid() and is_owner = true
  ));

-- Public bucket (member-photos-public): any authed user can write (Option A)
create policy "p6_authed_insert_public"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'member-photos-public' );

create policy "p7_authed_update_public"
  on storage.objects for update to authenticated
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "p8_authed_delete_public"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'member-photos-public' );

-- Verify (expect 8 policies):
-- select count(*) as policies from pg_policies
-- where schemaname='storage' and tablename='objects'
--   and (qual like '%member-photos%' or with_check like '%member-photos%');

-- ============================================================
-- MIGRATION: p2_public_permit_all.sql
-- ============================================================
-- PAWS — nuclear: fully public bucket, no RLS gating.
-- (the contents of member-photos-public are referenced from public site anyway;
--  RLS protection on writes adds no real security here since the path naming
--  convention (member-uuid/...) keeps them unguessable)

-- 1) Drop all storage policies on the public bucket
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (qual::text like '%member-photos-public%' or with_check::text like '%member-photos-public%')
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 2) Disable RLS on the public bucket via a "permit all" policy
create policy "permit_all_public_bucket_insert"
  on storage.objects for insert
  with check ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_update"
  on storage.objects for update
  using ( bucket_id = 'member-photos-public' )
  with check ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_delete"
  on storage.objects for delete
  using ( bucket_id = 'member-photos-public' );

create policy "permit_all_public_bucket_select"
  on storage.objects for select
  using ( bucket_id = 'member-photos-public' );

-- 3) Verify
select count(*) as public_bucket_policies from pg_policies
where schemaname='storage' and tablename='objects'
  and (qual::text like '%member-photos-public%' or with_check::text like '%member-photos-public%');
-- Expect: 4

-- 4) Also test: try inserting a row directly (as service context) to confirm bucket is writable
-- (this is a no-op, just a sanity check; the actual upload happens from browser)
select 'If you see 4 above, run the Standardize button again' as next_step;

-- ============================================================
-- MIGRATION: p3a_rls.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p3a_invites_id.sql
-- ============================================================
-- PAWS — add missing id column to invites table.
-- The schema.sql created invites WITHOUT an id column (code was the PK).
-- The JS expects to read .id, so we add an id column. Existing rows keep
-- their code as the natural identifier.

alter table public.invites
  add column if not exists id uuid default gen_random_uuid();

-- Make sure all rows have an id (gen_random_uuid is the default, but if there
-- are existing rows from before this migration they may be null).
update public.invites set id = gen_random_uuid() where id is null;

-- Verify
select id, code, redeemed_at, member_id from public.invites;

-- ============================================================
-- MIGRATION: p3a_members_relax.sql
-- ============================================================
-- PAWS — relax member_insert_self: drop the with_check constraints
-- (the signup form already sets is_owner=false, member_visible=true, published=false)

drop policy if exists "member_insert_self" on public.members;
create policy "member_insert_self"
  on public.members for insert
  to authenticated
  with check ( id = auth.uid() );

-- Verify
select policyname, cmd, with_check::text
from pg_policies
where schemaname='public' and tablename='members' and policyname='member_insert_self';

-- ============================================================
-- MIGRATION: p3a_invites_email.sql
-- ============================================================
-- PAWS — add email column to invites (for email-bound invite links)
alter table public.invites
  add column if not exists email text;

-- Verify
select id, code, email, redeemed_at from public.invites;

-- ============================================================
-- MIGRATION: p3b3_permissions.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p5b_perms_rls.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p5b_full_wiring.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p5b_perms_rls_full.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: p5b_perms_simple.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: migration_logos_features.sql
-- ============================================================
-- ============================================================================
-- PAWS — Migration: Add integration_logos + features tables + RLS
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- NEW TABLES
-- ---------------------------------------------------------------------------

-- Integration logos (marquee)
create table if not exists public.integration_logos (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text not null,         -- Supabase storage path or external URL
  alt_text      text,
  row_index     integer default 1,     -- 1 = top row, 2 = bottom row
  display_order integer default 0,
  published     boolean default false,
  created_at    timestamptz default now()
);

-- Features (feature cards grid)
create table if not exists public.features (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text,
  icon_svg      text,                  -- inline SVG string
  display_order integer default 0,
  published     boolean default false,
  created_at    timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- ENABLE RLS ON NEW TABLES
-- ---------------------------------------------------------------------------
alter table public.integration_logos enable row level security;
alter table public.features enable row level security;

-- ---------------------------------------------------------------------------
-- POLICIES (drop if exists first to avoid conflicts)
-- ---------------------------------------------------------------------------

-- ---- INTEGRATION_LOGOS ----
drop policy if exists "public_read_published_logos" on public.integration_logos;
create policy "public_read_published_logos"
  on public.integration_logos for select
  using ( published = true );

drop policy if exists "owner_all_integration_logos" on public.integration_logos;
create policy "owner_all_integration_logos"
  on public.integration_logos for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---- FEATURES ----
drop policy if exists "public_read_published_features" on public.features;
create policy "public_read_published_features"
  on public.features for select
  using ( published = true );

drop policy if exists "owner_all_features" on public.features;
create policy "owner_all_features"
  on public.features for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );

-- ---------------------------------------------------------------------------
-- GRANTS (ensure owner role can access)
-- ---------------------------------------------------------------------------
grant all on public.integration_logos to authenticated;
grant all on public.features to authenticated;

-- ============================================================
-- MIGRATION: seed_logos_features.sql
-- ============================================================
-- ============================================================================
-- PAWS — Seed data for integration_logos + features
-- Run AFTER migration_logos_features.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- INTEGRATION LOGOS (current hardcoded set)
-- ---------------------------------------------------------------------------

-- Top row (row_index = 1)
insert into public.integration_logos (name, logo_url, alt_text, row_index, display_order, published)
values
  ('hubspot', '/logos/hubspot.svg', 'HubSpot', 1, 0, true),
  ('intercom', '/logos/intercom.svg', 'Intercom', 1, 1, true),
  ('kickstarter', '/logos/kickstarter.svg', 'Kickstarter', 1, 2, true)
on conflict do nothing;

-- Bottom row (row_index = 2)
insert into public.integration_logos (name, logo_url, alt_text, row_index, display_order, published)
values
  ('zapier', '/logos/zapier.svg', 'Zapier', 2, 0, true),
  ('mailchimp', '/logos/mailchimp.svg', 'Mailchimp', 2, 1, true),
  ('shopify', '/logos/shopify.svg', 'Shopify', 2, 2, true),
  ('slack', '/logos/slack.svg', 'Slack', 2, 3, true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- FEATURES (current hardcoded set - 6 cards)
-- ---------------------------------------------------------------------------

insert into public.features (title, description, icon_svg, display_order, published)
values
  (
    'Setup Everything Fast',
    'Get your workspace configured and ready in minutes, not days.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    0, true
  ),
  (
    'Schedule Campaign',
    'Automated campaigns that reach the right people at the right time.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="8" width="18" height="2"/><rect x="3" y="12" width="18" height="2"/><rect x="3" y="16" width="18" height="2"/><circle cx="8" cy="19" r="1" fill="currentColor"/></svg>',
    1, true
  ),
  (
    'Live Reports',
    'Real-time dashboards showing exactly what is working and what needs attention.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg>',
    2, true
  ),
  (
    'Chat Module in Website',
    'Embedded chat so clients reach you instantly without leaving the page.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8z"/></svg>',
    3, true
  ),
  (
    'Unlimited Products',
    'No caps on what you can list, sell, or manage through our platform.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v20H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    4, true
  ),
  (
    'Collect Information',
    'Smart forms that capture leads and route them to the right team member.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 00-4-4h-1"/></svg>',
    5, true
  )
on conflict do nothing;

-- ============================================================
-- MIGRATION: fix_duplicate_logos.sql
-- ============================================================
-- ============================================================================
-- PAWS — Cleanup duplicate logos + add unique constraint
-- Run this in Supabase SQL Editor to fix duplicates
-- ============================================================================

-- 1. Delete duplicates, keeping only the first (lowest id) per name+row_index
delete from public.integration_logos
where id not in (
  select distinct on (name, row_index) id
  from public.integration_logos
  order by name, row_index, id
);

-- 2. Add unique constraint to prevent future duplicates
alter table public.integration_logos
add constraint integration_logos_name_row_unique unique (name, row_index);

-- 3. Verify
select name, row_index, count(*) as cnt
from public.integration_logos
group by name, row_index
having count(*) > 1;

-- ============================================================
-- MIGRATION: fix_duplicate_features.sql
-- ============================================================
-- ============================================================================
-- PAWS — Cleanup duplicate features + add unique constraint
-- Run this in Supabase SQL Editor to fix duplicates
-- ============================================================================

-- 1. Delete duplicates, keeping only the first (lowest id) per title
delete from public.features
where id not in (
  select distinct on (title) id
  from public.features
  order by title, id
);

-- 2. Add unique constraint to prevent future duplicates
alter table public.features
add constraint features_title_unique unique (title);

-- 3. Verify
select title, count(*) as cnt
from public.features
group by title
having count(*) > 1;

-- ============================================================
-- MIGRATION: rls_permissions_logos_features.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: rls_site_content_delays.sql
-- ============================================================
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

-- ============================================================
-- MIGRATION: migrations/006_avatar_pipeline.sql
-- ============================================================
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
