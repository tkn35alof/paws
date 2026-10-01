-- ============================================================================
-- PAWS — Seed data for integration_logos + features
-- Run AFTER migration_logos_features.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- INTEGRATION LOGOS (current hardcoded set)
-- ---------------------------------------------------------------------------

-- Top row (row_index = 1)
insert into public.integration_logos (name, logo_url, alt_text, row_index, display_order, published)
values
  ('hubspot', '/logos/hubspot.svg', 'HubSpot', 1, 0, true),
  ('intercom', '/logos/intercom.svg', 'Intercom', 1, 1, true),
  ('kickstarter', '/logos/kickstarter.svg', 'Kickstarter', 1, 2, true)
on conflict do nothing;

-- Bottom row (row_index = 2)
insert into public.integration_logos (name, logo_url, alt_text, row_index, display_order, published)
values
  ('zapier', '/logos/zapier.svg', 'Zapier', 2, 0, true),
  ('mailchimp', '/logos/mailchimp.svg', 'Mailchimp', 2, 1, true),
  ('shopify', '/logos/shopify.svg', 'Shopify', 2, 2, true),
  ('slack', '/logos/slack.svg', 'Slack', 2, 3, true)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- FEATURES (current hardcoded set - 6 cards)
-- ---------------------------------------------------------------------------

insert into public.features (title, description, icon_svg, display_order, published)
values
  (
    'Setup Everything Fast',
    'Get your workspace configured and ready in minutes, not days.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
    0, true
  ),
  (
    'Schedule Campaign',
    'Automated campaigns that reach the right people at the right time.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="8" width="18" height="2"/><rect x="3" y="12" width="18" height="2"/><rect x="3" y="16" width="18" height="2"/><circle cx="8" cy="19" r="1" fill="currentColor"/></svg>',
    1, true
  ),
  (
    'Live Reports',
    'Real-time dashboards showing exactly what is working and what needs attention.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg>',
    2, true
  ),
  (
    'Chat Module in Website',
    'Embedded chat so clients reach you instantly without leaving the page.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8z"/></svg>',
    3, true
  ),
  (
    'Unlimited Products',
    'No caps on what you can list, sell, or manage through our platform.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v20H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>',
    4, true
  ),
  (
    'Collect Information',
    'Smart forms that capture leads and route them to the right team member.',
    '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 00-4-4h-1"/></svg>',
    5, true
  )
on conflict do nothing;