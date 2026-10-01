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