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
