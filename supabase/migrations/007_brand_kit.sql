-- ============================================================================
-- PAWS Brand Kit — canonical design tokens as queryable database rows
-- Source of truth: brand/paws-brand-kit.json
-- Regenerate:     python brand/generate_brand_kit.py
-- Apply:          supabase db push   (or paste into the SQL editor)
-- ============================================================================

create table if not exists public.brand_kit (
  id          uuid primary key default gen_random_uuid(),
  category    text not null,   -- color | typography | spacing | radius | shadow | motion | layout | component | voice | asset
  group_name  text not null,   -- surfaces | lines | accent | family | scale | ...
  key         text not null,   -- pink | font-display | space-4 | ...
  value       text not null,   -- #ff5a8a
  usage       text,
  meta        jsonb default '{}',
  updated_at  timestamptz default now(),
  unique (category, group_name, key)
);

create index if not exists brand_kit_category_idx on public.brand_kit (category);
create index if not exists brand_kit_group_idx on public.brand_kit (group_name);

comment on table public.brand_kit is 'PAWS canonical brand tokens. Read from any app; edit brand/paws-brand-kit.json then re-seed.';

-- Tokens are public; only the owner may write.
alter table public.brand_kit enable row level security;

drop policy if exists "brand_kit_public_read" on public.brand_kit;
create policy "brand_kit_public_read"
  on public.brand_kit for select
  to anon, authenticated
  using (true);

drop policy if exists "brand_kit_owner_write" on public.brand_kit;
create policy "brand_kit_owner_write"
  on public.brand_kit for all
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ============================================================================
-- Seed (idempotent upsert)
-- ============================================================================
insert into public.brand_kit (category, group_name, key, value, usage, meta) values

  ('color', 'surfaces', 'void', '#07070d', 'Deepest page background', '{"contrastOn": null}'::jsonb),
  ('color', 'surfaces', 'surface', '#0e0e18', 'Primary surface / nav bar', '{"contrastOn": {"ink": 18.46}}'::jsonb),
  ('color', 'surfaces', 'surface-2', '#14141f', 'Cards, containers, dropdowns', '{}'::jsonb),
  ('color', 'surfaces', 'surface-3', '#1a1a28', 'Subtle raised surface', '{}'::jsonb),
  ('color', 'surfaces', 'surface-4', '#202030', 'Deepest raised surface', '{}'::jsonb),
  ('color', 'lines', 'line', '#25253a', 'Primary borders, section dividers', '{}'::jsonb),
  ('color', 'lines', 'line-2', '#2e2e44', 'Secondary borders, input borders', '{}'::jsonb),
  ('color', 'lines', 'line-glow', 'rgba(255, 90, 138, 0.25)', 'Border glow on accent elements', '{}'::jsonb),
  ('color', 'accent', 'pink', '#ff5a8a', 'PRIMARY ACCENT — buttons, highlights, links', '{"contrastOn": {"void": 6.77, "surface": 6.47}}'::jsonb),
  ('color', 'accent', 'pink-deep', '#e03d6a', 'Pink hover / active state', '{}'::jsonb),
  ('color', 'accent', 'pink-glow', 'rgba(255, 90, 138, 0.35)', 'Button glow, pulse shadow', '{}'::jsonb),
  ('color', 'accent', 'pink-wash', 'rgba(255, 90, 138, 0.08)', 'Subtle tint, hover fill', '{}'::jsonb),
  ('color', 'accent', 'pink-rule', 'rgba(255, 90, 138, 0.15)', 'Accent border rule', '{}'::jsonb),
  ('color', 'secondary', 'cyan', '#38e8d0', 'Kicker labels, section meta accents', '{"contrastOn": {"void": 13.03}}'::jsonb),
  ('color', 'secondary', 'blue', '#2d57ee', 'Secondary accent — rarely used', '{"contrastOn": {"void": 3.55}}'::jsonb),
  ('color', 'secondary', 'blue-glow', 'rgba(45, 87, 238, 0.2)', 'Blue glow shadow', '{}'::jsonb),
  ('color', 'text', 'ink', '#f5f5f8', 'Primary text, headings', '{"contrastOn": {"void": 18.46}}'::jsonb),
  ('color', 'text', 'ink-2', '#a0a0b8', 'Secondary text, paragraphs', '{"contrastOn": {"surface": 7.5}}'::jsonb),
  ('color', 'text', 'ink-3', '#6a6a82', 'Muted tertiary text, roles', '{"contrastOn": {"surface": 3.65}}'::jsonb),
  ('color', 'text', 'muted', '#4a4a60', 'Placeholders, footer text', '{}'::jsonb),
  ('color', 'text', 'muted-2', '#303044', 'Heavily muted, bottom bar', '{}'::jsonb),
  ('typography', 'family', 'display', '''Space Grotesk'', ''Segoe UI'', system-ui, sans-serif', 'Headings, nav brand, buttons, feature icons', '{"googleFont": "Space+Grotesk:wght@400;500;600;700"}'::jsonb),
  ('typography', 'family', 'body', '''IBM Plex Sans'', ''Segoe UI'', system-ui, sans-serif', 'Body text, forms, paragraphs', '{"googleFont": "IBM+Plex+Sans:wght@300;400;500;600"}'::jsonb),
  ('typography', 'family', 'mono', '''IBM Plex Mono'', ''Consolas'', monospace', 'Tags, chips, meta labels, code', '{"googleFont": "IBM+Plex+Mono:wght@400;500"}'::jsonb),
  ('typography', 'scale', 'micro', '11px', 'Tag chips', '{}'::jsonb),
  ('typography', 'scale', 'xs', '12px', 'Logo names, footer headings, bottom bar', '{}'::jsonb),
  ('typography', 'scale', 'sm', '13px', 'Small text, labels, kicker, meta items', '{}'::jsonb),
  ('typography', 'scale', 'base', '14px', 'Role tags, inputs, nav sign-in', '{}'::jsonb),
  ('typography', 'scale', 'md', '15px', 'Buttons, form inputs', '{}'::jsonb),
  ('typography', 'scale', 'lg', '17px', 'Body default', '{}'::jsonb),
  ('typography', 'scale', 'xl', '20px', 'Member card names, feature card titles', '{}'::jsonb),
  ('typography', 'scale', '2xl', '21px', 'Hero lead paragraph', '{}'::jsonb),
  ('typography', 'scale', '3xl', '22px', 'Testimonial quotes', '{}'::jsonb),
  ('typography', 'scale', 'h3', 'clamp(22px, 2.8vw, 28px)', 'Section h3', '{}'::jsonb),
  ('typography', 'scale', 'h2', 'clamp(32px, 5vw, 56px)', 'Section h2', '{}'::jsonb),
  ('typography', 'scale', 'h1', 'clamp(48px, 10vw, 104px)', 'Hero h1', '{}'::jsonb),
  ('typography', 'weight', 'light', '300', null, '{}'::jsonb),
  ('typography', 'weight', 'regular', '400', null, '{}'::jsonb),
  ('typography', 'weight', 'medium', '500', null, '{}'::jsonb),
  ('typography', 'weight', 'semibold', '600', null, '{}'::jsonb),
  ('typography', 'weight', 'bold', '700', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'h1', '-0.05em', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'h2', '-0.03em', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'h3', '-0.03em', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'h4', '-0.01em', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'label', '0.1em', null, '{}'::jsonb),
  ('typography', 'letter-spacing', 'tag', '0.02em', null, '{}'::jsonb),
  ('spacing', 'space', '1', '4px', 'Micro spacing', '{}'::jsonb),
  ('spacing', 'space', '2', '8px', 'Small gap, icon gap', '{}'::jsonb),
  ('spacing', 'space', '3', '12px', 'Medium gap', '{}'::jsonb),
  ('spacing', 'space', '4', '16px', 'Base spacing, paragraph margin', '{}'::jsonb),
  ('spacing', 'space', '5', '24px', 'Section spacing, block margin', '{}'::jsonb),
  ('spacing', 'space', '6', '32px', 'Large spacing, hero CTA gap', '{}'::jsonb),
  ('spacing', 'space', '7', '48px', 'Section divider', '{}'::jsonb),
  ('spacing', 'space', '8', '64px', 'Major section spacing', '{}'::jsonb),
  ('spacing', 'space', '9', '96px', 'Full-width spacing', '{}'::jsonb),
  ('spacing', 'space', '10', '128px', 'Hero vertical padding', '{}'::jsonb),
  ('radius', 'radius', 'sm', '6px', 'Small inputs, tag hover', '{}'::jsonb),
  ('radius', 'radius', 'md', '12px', 'Textareas, feature icon tiles', '{}'::jsonb),
  ('radius', 'radius', 'lg', '18px', 'Cards, modals, logo boxes', '{}'::jsonb),
  ('radius', 'radius', 'card', '16px', 'Standard card corners', '{}'::jsonb),
  ('radius', 'radius', 'pill', '999px', 'Buttons, avatars, tags, nav', '{}'::jsonb),
  ('shadow', 'shadow', 'nav', '0 2px 20px rgba(0,0,0,0.5)', 'Sticky nav scrolled state', '{}'::jsonb),
  ('shadow', 'shadow', 'card-hover', '0 20px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255, 90, 138, 0.15)', 'Member card hover', '{}'::jsonb),
  ('shadow', 'shadow', 'btn', '0 0 20px rgba(255, 90, 138, 0.35)', 'Primary button glow', '{}'::jsonb),
  ('shadow', 'shadow', 'btn-hover', '0 0 30px rgba(255, 90, 138, 0.35)', 'Primary button hover glow', '{}'::jsonb),
  ('shadow', 'shadow', 'dropdown', '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(255, 90, 138, 0.08)', 'Nav dropdown', '{}'::jsonb),
  ('shadow', 'shadow', 'focus-ring', '0 0 0 3px rgba(255, 90, 138, 0.15)', 'Input focus state', '{}'::jsonb),
  ('shadow', 'shadow', 'border-glow', '0 0 0 1px rgba(255, 90, 138, 0.15), 0 8px 32px rgba(232, 82, 127, 0.15)', 'Border-glow card hover', '{}'::jsonb),
  ('motion', 'duration', 'fast', '0.12s', 'Button transform', '{}'::jsonb),
  ('motion', 'duration', 'normal', '0.15s', 'Color, border transitions', '{}'::jsonb),
  ('motion', 'duration', 'medium', '0.25s', 'Button background, dropdown', '{}'::jsonb),
  ('motion', 'duration', 'slow', '0.3s', 'Card hover, border glow', '{}'::jsonb),
  ('motion', 'duration', 'reveal', '0.6s', 'Scroll reveal', '{}'::jsonb),
  ('motion', 'easing', 'slide', 'cubic-bezier(0.65, 0, 0.35, 1)', 'Button slide-up, accent underline', '{}'::jsonb),
  ('motion', 'easing', 'reveal', 'cubic-bezier(0.2, 0, 0, 1)', 'Scroll reveal, card lift', '{}'::jsonb),
  ('motion', 'easing', 'linear', 'linear', 'Marquee loops', '{}'::jsonb),
  ('motion', 'keyframe', 'pulse', 'pulse 2s ease-in-out infinite', 'Hero meta dots', '{}'::jsonb),
  ('motion', 'keyframe', 'marquee', 'marquee-scroll 40s linear infinite', 'Logo marquee', '{}'::jsonb),
  ('motion', 'keyframe', 'marquee-logos', 'marquee-scroll-logos 40s linear infinite', 'Logos marquee', '{}'::jsonb),
  ('motion', 'keyframe', 'marquee-v', 'marquee-v 40s linear infinite', 'Vertical testimonial marquee', '{}'::jsonb),
  ('motion', 'keyframe', 'blob-rotate', 'blob-rotate 30s ease-in-out infinite', 'Background glow blobs', '{}'::jsonb),
  ('layout', 'layout', 'maxWidth', '1180px', 'Content wrap (.wrap)', '{}'::jsonb),
  ('layout', 'layout', 'navHeight', '68px', 'Sticky nav (18px pad + content)', '{}'::jsonb),
  ('layout', 'layout', 'sectionPadding', '112px 0', 'Default section vertical padding', '{}'::jsonb),
  ('layout', 'layout', 'heroPadding', '140px 0 100px', 'Hero section padding', '{}'::jsonb),
  ('layout', 'layout', 'memberCardWidth', '300px', 'Team grid card fixed width', '{}'::jsonb),
  ('layout', 'layout', 'memberPhotoAspect', '4/5', 'Member photo aspect ratio', '{}'::jsonb),
  ('layout', 'breakpoint', 'mobile', '600px', null, '{}'::jsonb),
  ('layout', 'breakpoint', 'tablet', '768px', null, '{}'::jsonb),
  ('layout', 'breakpoint', 'desktop', '900px', null, '{}'::jsonb),
  ('layout', 'breakpoint', 'wide', '1024px', null, '{}'::jsonb),
  ('component', 'button', 'primary.bg', 'var(--paws-pink)', null, '{}'::jsonb),
  ('component', 'button', 'primary.color', '#fff', null, '{}'::jsonb),
  ('component', 'button', 'primary.padding', '14px 28px', null, '{}'::jsonb),
  ('component', 'button', 'primary.radius', 'var(--radius-pill)', null, '{}'::jsonb),
  ('component', 'button', 'primary.font', 'var(--font-display)', null, '{}'::jsonb),
  ('component', 'button', 'primary.weight', '600', null, '{}'::jsonb),
  ('component', 'button', 'primary.hoverBg', 'var(--paws-pink-deep)', null, '{}'::jsonb),
  ('component', 'button', 'primary.hoverTransform', 'translateY(-1px)', null, '{}'::jsonb),
  ('component', 'button', 'ghost.bg', 'transparent', null, '{}'::jsonb),
  ('component', 'button', 'ghost.color', 'var(--paws-ink)', null, '{}'::jsonb),
  ('component', 'button', 'ghost.border', '1px solid var(--paws-line-2)', null, '{}'::jsonb),
  ('component', 'button', 'ghost.radius', 'var(--radius-pill)', null, '{}'::jsonb),
  ('component', 'button', 'ghost.hoverBg', 'var(--paws-pink-wash)', null, '{}'::jsonb),
  ('component', 'button', 'ghost.hoverColor', 'var(--paws-pink)', null, '{}'::jsonb),
  ('component', 'nav', 'bg', 'rgba(14, 14, 24, 0.85)', null, '{}'::jsonb),
  ('component', 'nav', 'backdrop', 'blur(16px) saturate(180%)', null, '{}'::jsonb),
  ('component', 'nav', 'border', '1px solid var(--paws-line)', null, '{}'::jsonb),
  ('component', 'nav', 'radius', 'var(--radius-pill)', null, '{}'::jsonb),
  ('component', 'nav', 'font', 'var(--font-display)', null, '{}'::jsonb),
  ('component', 'nav', 'fontSize', '15px', null, '{}'::jsonb),
  ('component', 'card', 'bg', 'rgba(20, 20, 31, 0.7)', null, '{}'::jsonb),
  ('component', 'card', 'backdrop', 'blur(8px)', null, '{}'::jsonb),
  ('component', 'card', 'border', '1px solid var(--paws-line)', null, '{}'::jsonb),
  ('component', 'card', 'radius', 'var(--radius-card)', null, '{}'::jsonb),
  ('component', 'card', 'hoverBorder', 'var(--paws-pink-rule)', null, '{}'::jsonb),
  ('component', 'card', 'hoverTransform', 'translateY(-6px)', null, '{}'::jsonb),
  ('component', 'input', 'bg', 'rgba(14, 14, 24, 0.6)', null, '{}'::jsonb),
  ('component', 'input', 'border', '1px solid var(--paws-line-2)', null, '{}'::jsonb),
  ('component', 'input', 'radius', 'var(--radius-pill)', null, '{}'::jsonb),
  ('component', 'input', 'focusBorder', 'var(--paws-pink)', null, '{}'::jsonb),
  ('component', 'input', 'focusRing', '0 0 0 3px var(--paws-pink-rule)', null, '{}'::jsonb),
  ('component', 'tag', 'font', 'var(--font-mono)', null, '{}'::jsonb),
  ('component', 'tag', 'fontSize', '11px', null, '{}'::jsonb),
  ('component', 'tag', 'padding', '3px 10px', null, '{}'::jsonb),
  ('component', 'tag', 'border', '1px solid var(--paws-line-2)', null, '{}'::jsonb),
  ('component', 'tag', 'radius', 'var(--radius-pill)', null, '{}'::jsonb),
  ('component', 'tag', 'color', 'var(--paws-ink-3)', null, '{}'::jsonb),
  ('component', 'tag', 'hoverBorder', 'var(--paws-pink-rule)', null, '{}'::jsonb),
  ('component', 'tag', 'hoverColor', 'var(--paws-pink)', null, '{}'::jsonb),
  ('component', 'kicker', 'font', 'var(--font-display)', null, '{}'::jsonb),
  ('component', 'kicker', 'fontSize', '13px', null, '{}'::jsonb),
  ('component', 'kicker', 'weight', '600', null, '{}'::jsonb),
  ('component', 'kicker', 'color', 'var(--paws-cyan)', null, '{}'::jsonb),
  ('component', 'kicker', 'letterSpacing', '0.12em', null, '{}'::jsonb),
  ('component', 'kicker', 'textTransform', 'uppercase', null, '{}'::jsonb),
  ('voice', 'voice', 'tone', '["Direct", "Confident", "Technical", "Warm"]', 'Brand tone descriptors', '{}'::jsonb),
  ('voice', 'voice', 'headlineStyle', 'Short, punchy, benefit-led. Title case or sentence case with a pink accent word.', null, '{}'::jsonb),
  ('voice', 'voice', 'avoid', '["Purple-blue gradients", "Generic sans-serif", "Bubble-wrap cards", "AI slop phrasing", "Excessive emoji"]', null, '{}'::jsonb),
  ('voice', 'voice', 'taglines', '{"home": "Specialists, not freelancers.", "portal": "Your profile, your rules."}', null, '{}'::jsonb),
  ('asset', 'asset', 'fonts', 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap', null, '{}'::jsonb),
  ('asset', 'asset', 'logoMark', 'PAWS wordmark — bold Space Grotesk, pink dot on the brand mark', null, '{}'::jsonb),
  ('asset', 'asset', 'favicon', 'Not yet defined — recommend a pink paw glyph on void background', null, '{}'::jsonb)

on conflict (category, group_name, key) do update
  set value = excluded.value,
      usage = excluded.usage,
      meta = excluded.meta,
      updated_at = now();

-- ============================================================================
-- Convenience views
-- ============================================================================

create or replace view public.v_brand_colors as
  select group_name as palette, key, value, usage, meta
  from public.brand_kit where category = 'color' order by group_name, key;

create or replace view public.v_brand_typography as
  select group_name as kind, key, value, usage, meta
  from public.brand_kit where category = 'typography' order by group_name, key;

create or replace view public.v_brand_spacing as
  select key as token, value, usage
  from public.brand_kit where category = 'spacing' order by key;

create or replace view public.v_brand_all as
  select category, group_name, key, value, usage, meta
  from public.brand_kit order by category, group_name, key;
