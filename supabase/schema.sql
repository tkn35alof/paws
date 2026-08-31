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
  display_order integer default 0,
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
