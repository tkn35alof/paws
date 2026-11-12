-- Portfolio media: members upload images/logos for their portfolio pages.
-- Public reads (the pages are public); members write only into their own folder.

insert into storage.buckets (id, name, public)
values ('portfolio-media', 'portfolio-media', true)
on conflict (id) do nothing;

drop policy if exists "member_insert_own_portfolio_media" on storage.objects;
create policy "member_insert_own_portfolio_media"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "member_update_own_portfolio_media" on storage.objects;
create policy "member_update_own_portfolio_media"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "member_delete_own_portfolio_media" on storage.objects;
create policy "member_delete_own_portfolio_media"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'portfolio-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The bucket is public, so no select policy is needed.
