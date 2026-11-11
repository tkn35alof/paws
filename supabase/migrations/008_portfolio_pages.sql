-- ============================================================
-- MIGRATION: portfolio_pages
-- Per-member portfolio content for the member portfolio
-- (template + content model). One row per member per page.
-- ============================================================

create table if not exists public.portfolio_pages (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  page_key    text not null,                 -- home | projects | services | testimonials | about | contact
  content     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  unique (member_id, page_key)
);

create index if not exists portfolio_pages_member_idx on public.portfolio_pages (member_id);

alter table public.portfolio_pages enable row level security;

-- Public: read the pages of published members.
create policy "public_read_published_portfolio_pages"
  on public.portfolio_pages for select
  using (
    exists (select 1 from public.members m where m.id = member_id and m.published = true)
  );

-- Member: read own pages.
create policy "member_read_own_portfolio_pages"
  on public.portfolio_pages for select
  to authenticated
  using ( member_id = auth.uid() );

-- Member: insert own pages.
create policy "member_insert_own_portfolio_pages"
  on public.portfolio_pages for insert
  to authenticated
  with check ( member_id = auth.uid() );

-- Member: update own pages.
create policy "member_update_own_portfolio_pages"
  on public.portfolio_pages for update
  to authenticated
  using ( member_id = auth.uid() )
  with check ( member_id = auth.uid() );

-- Owner: full control.
create policy "owner_all_portfolio_pages"
  on public.portfolio_pages for all
  to authenticated
  using ( public.is_owner() )
  with check ( public.is_owner() );
