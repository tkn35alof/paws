-- ============================================================================
-- PAWS — Team seed (6 non-owner members)
-- Run this AFTER you have inserted your OWN owner row (step 2).
-- Each member is a real person you'll add to auth.users, then link to members.
-- INSTRUCTIONS:
--   1. For each person below: Supabase → Authentication → Users → "Add user"
--      with their email + a password (or send invite). Capture the user UUID.
--   2. Replace 'PASTE-USER-UUID' in the matching INSERT with that UUID.
--   3. Run the whole script in Supabase SQL editor.
--   4. After this, each person can log into /login (magic link) and edit their
--      own profile at /portal. The owner (you) can publish them from /admin.
-- ============================================================================

-- IMPORTANT: These placeholders are just for SQL syntax. Replace each UUID
-- with the real auth.users.id for that person, or the inserts will fail with
-- a foreign-key violation.

insert into public.members (id, slug, display_name, tagline, bio, role_tags, skills, links, availability, published, member_visible, is_owner, display_order) values
('PASTE-UUID-1', 'med-va', 'Med VA',
 'Healthcare support, patient coordination, and clinical research ops.',
 'Background as a medical virtual assistant. Brings HIPAA-aware handling, research summaries, and calm client communication.',
 array['Medical VA','Patient Coordination','Research','HIPAA-aware'],
 array['Patient scheduling','EMR','Research summaries','Documentation'],
 '{"linkedin":""}'::jsonb,
 'available', false, true, false, 1),

('PASTE-UUID-2', 'multi-ea', 'Multi-EA',
 'Executive support, social media operations, and operations lead.',
 'Background as a multi-skilled executive assistant. Owns inbox triage, scheduling, content posting, and the team''s operational rhythm.',
 array['Executive Assistant','Social Media Ops','Operations'],
 array['Inbox triage','Scheduling','Content posting','Asana','ClickUp'],
 '{"linkedin":"","instagram":""}'::jsonb,
 'available', false, true, false, 2),

('PASTE-UUID-3', 'dev', 'Dev',
 'Full-stack engineer — front-end focus, with back-end chops.',
 'Builds web apps end to end. Front-end polish and component work, with a hand on the back-end when the data model gets interesting.',
 array['Front-end','Back-end','Web Apps'],
 array['React','Vite','TypeScript','Supabase','Node'],
 '{"github":""}'::jsonb,
 'busy', false, true, false, 3),

('PASTE-UUID-4', 'bpo-csr', 'BPO CSR',
 'Client service specialist with credit-bureau and BPO experience.',
 'Former BPO client service rep with hands-on experience handling credit bureau workflows. Sharp on compliance, calm under pressure.',
 array['Client Service','BPO','Credit Bureau','Compliance'],
 array['Customer support','Dispute handling','Documentation','Process'],
 '{"linkedin":""}'::jsonb,
 'available', false, true, false, 4),

('PASTE-UUID-5', 'electrician-1', 'Electrician 1 (NC2)',
 'NC2-certified electrician — site installs and service work.',
 'NC2-certified. Handles on-site electrical work, panel installs, and field service for the team''s physical-deliverable projects.',
 array['Electrician','NC2','Site Install'],
 array['Wiring','Panel install','Service','Inspection'],
 '{}'::jsonb,
 'available', false, true, false, 5),

('PASTE-UUID-6', 'electrician-2', 'Electrician 2 (NC2)',
 'NC2-certified electrician — residential and light commercial.',
 'NC2-certified partner. Focused on residential wiring, troubleshooting, and light commercial jobs alongside the team''s deployment projects.',
 array['Electrician','NC2','Residential','Troubleshooting'],
 array['Residential wiring','Troubleshooting','Service'],
 '{}'::jsonb,
 'available', false, true, false, 6);

-- Optional: a third electrician slot. Uncomment if you have one.
-- insert into public.members (id, slug, display_name, tagline, role_tags, availability, member_visible, display_order) values
-- ('PASTE-UUID-7', 'electrician-3', 'Electrician 3 (NC2)', 'NC2-certified.', array['Electrician','NC2'], 'available', true, 7);

-- You can publish a member at any time from /admin, or directly:
-- update public.members set published = true where slug = 'dev';
