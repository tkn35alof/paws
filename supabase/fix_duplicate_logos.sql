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