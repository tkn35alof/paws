-- PAWS — add email column to invites (for email-bound invite links)
alter table public.invites
  add column if not exists email text;

-- Verify
select id, code, email, redeemed_at from public.invites;
