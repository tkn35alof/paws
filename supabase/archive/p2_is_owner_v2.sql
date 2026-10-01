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
