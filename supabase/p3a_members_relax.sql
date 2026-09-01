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
