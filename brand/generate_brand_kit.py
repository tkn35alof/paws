#!/usr/bin/env python3
"""
PAWS Brand Kit generator.

Reads brand/paws-brand-kit.json (the canonical source of truth) and emits
supabase/migrations/007_brand_kit.sql — a table definition plus an idempotent
seed of every token.

Usage:
    python brand/generate_brand_kit.py

Then apply to Supabase:
    supabase db push --project-ref <ref>
"""
import json
import os
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "brand", "paws-brand-kit.json")
OUT = os.path.join(ROOT, "supabase", "migrations", "007_brand_kit.sql")


def esc(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def collect(kit):
    rows = []

    def add(category, group, key, value, usage=None, meta=None):
        rows.append((category, group, key, value, usage, meta or {}))

    # Colors
    for group, items in kit["color"].items():
        for key, obj in items.items():
            meta = {k: v for k, v in obj.items() if k not in ("value", "usage")}
            add("color", group, key, obj["value"], obj.get("usage"), meta)

    # Typography
    for key, obj in kit["typography"]["families"].items():
        meta = {k: v for k, v in obj.items() if k not in ("value", "usage")}
        add("typography", "family", key, obj["value"], obj.get("usage"), meta)
    for key, obj in kit["typography"]["scale"].items():
        add("typography", "scale", key, obj["value"], obj.get("usage"))
    for key, obj in kit["typography"]["weights"].items():
        add("typography", "weight", key, obj["value"])
    for key, obj in kit["typography"]["letterSpacing"].items():
        add("typography", "letter-spacing", key, obj["value"], obj.get("usage"))

    # Spacing / radius
    for key, obj in kit["spacing"].items():
        add("spacing", "space", key, obj["value"], obj.get("usage"))
    for key, obj in kit["radius"].items():
        add("radius", "radius", key, obj["value"], obj.get("usage"))

    # Shadow
    for key, obj in kit["shadow"].items():
        add("shadow", "shadow", key, obj["value"], obj.get("usage"))

    # Motion
    for key, obj in kit["motion"]["duration"].items():
        add("motion", "duration", key, obj["value"], obj.get("usage"))
    for key, obj in kit["motion"]["easing"].items():
        add("motion", "easing", key, obj["value"], obj.get("usage"))
    for key, obj in kit["motion"]["keyframes"].items():
        add("motion", "keyframe", key, obj["value"], obj.get("usage"))

    # Layout
    for key, obj in kit["layout"].items():
        if key == "breakpoints":
            for bk, bv in obj.items():
                add("layout", "breakpoint", bk, bv["value"])
        else:
            add("layout", "layout", key, obj["value"], obj.get("usage"))

    # Components — handles variant-style (button) and flat-property style (nav)
    for component, body in kit["components"].items():
        values = list(body.values())
        if values and all(isinstance(v, dict) for v in values):
            for variant, props in body.items():
                for prop_key, prop_value in props.items():
                    add("component", component, f"{variant}.{prop_key}", prop_value)
        else:
            for prop_key, prop_value in body.items():
                add("component", component, prop_key, prop_value)

    # Voice + assets
    voice = kit["voice"]
    add("voice", "voice", "tone", json.dumps(voice["tone"]), "Brand tone descriptors")
    add("voice", "voice", "headlineStyle", voice["headlineStyle"])
    add("voice", "voice", "avoid", json.dumps(voice["avoid"]))
    add("voice", "voice", "taglines", json.dumps(voice["taglines"]))
    for key, value in kit["assets"].items():
        add("asset", "asset", key, value)

    return rows


HEADER = """-- ============================================================================
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
"""

FOOTER = """
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
"""


def main():
    with open(SRC) as fh:
        kit = json.load(fh)

    rows = collect(kit)

    lines = [HEADER]
    for index, (category, group, key, value, usage, meta) in enumerate(rows):
        meta_sql = esc(json.dumps(meta)) + "::jsonb"
        # No terminator on the final row — the ON CONFLICT clause follows it.
        comma = "," if index < len(rows) - 1 else ""
        lines.append(
            f"  ({esc(category)}, {esc(group)}, {esc(key)}, {esc(value)}, "
            f"{esc(usage)}, {meta_sql}){comma}"
        )
    lines.append(FOOTER)

    with open(OUT, "w") as fh:
        fh.write("\n".join(lines))

    counts = Counter(row[0] for row in rows)
    print(f"brand kit: {len(rows)} tokens -> {os.path.relpath(OUT, ROOT)}")
    for category, count in sorted(counts.items()):
        print(f"  {category:<12} {count}")


if __name__ == "__main__":
    main()
