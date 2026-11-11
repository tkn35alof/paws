#!/usr/bin/env python3
"""Generate a Supabase migration that seeds the owner's portfolio content."""
import json, os

DST = r"C:/Users/ALOF/paws/public/portfolio-assets/content"
OUT = r"C:/Users/ALOF/paws/supabase/migrations/009_seed_owner_portfolio.sql"

PAGES = ['home', 'projects', 'services', 'testimonials', 'about', 'contact']

lines = [
    "-- ============================================================",
    "-- MIGRATION: seed the owner's portfolio content",
    "-- Content extracted from the portfolio replica templates.",
    "-- Re-running is safe (upsert on conflict).",
    "-- ============================================================",
    "",
    "insert into public.portfolio_pages (member_id, page_key, content)",
    "select m.id, v.page_key, v.content::jsonb",
    "from public.members m",
    "cross join (values",
]

for i, p in enumerate(PAGES):
    content = open(f"{DST}/{p}.json", encoding='utf-8').read()
    # compact the JSON and escape single quotes for SQL
    compact = json.dumps(json.loads(content), ensure_ascii=False, separators=(',', ':'))
    sql = compact.replace("'", "''")
    comma = "," if i < len(PAGES) - 1 else ""
    lines.append(f"  ('{p}', '{sql}'::text){comma}")

lines += [
    ") as v(page_key, content)",
    "where m.is_owner = true",
    "on conflict (member_id, page_key) do update",
    "  set content = excluded.content, updated_at = now();",
    "",
]

open(OUT, 'w', encoding='utf-8').write('\n'.join(lines))
print(f"wrote {OUT} ({os.path.getsize(OUT)} bytes)")
