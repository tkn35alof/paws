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
