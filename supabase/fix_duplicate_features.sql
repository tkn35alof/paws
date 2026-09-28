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