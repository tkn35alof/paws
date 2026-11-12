#!/usr/bin/env python3
"""Generate a migration that replaces every member's portfolio content with the
corrected extraction (container links no longer carry a concatenated label)."""
import json, os

DST = r"C:/Users/ALOF/paws/public/portfolio-assets/content"
OUTDIR = r"C:/Users/ALOF/paws/supabase/migrations"
PAGES = ['home', 'projects', 'services', 'testimonials', 'about', 'contact']

OWNER = {'slug': 'jhuriel', 'name': 'Jhuriel Guerra', 'tagline': 'Founder & Lead',
         'roles': ['Founder', 'GHL', 'AI Automation']}

MEMBERS = {
    'bpo-csr': {'name': 'BPO CSR', 'tagline': 'Client service specialist with credit-bureau and BPO experience.',
                'roles': ['Client Service', 'BPO', 'Credit Bureau', 'Compliance']},
    'jayjay': {'name': 'jayjay', 'tagline': 'Web apps and GHL automation.',
               'roles': ['Web Apps', 'GHL', 'Front-end']},
    'dev': {'name': 'Dev', 'tagline': 'Full-stack engineer — front-end focus, with back-end chops.',
            'roles': ['Front-end', 'Back-end', 'Web Apps']},
    'jay': {'name': 'jay gg', 'tagline': 'Web apps and automation.',
            'roles': ['Web Apps', 'Automation']},
}

OVERRIDES = {
    'rail__name': '{name}',
    'rail__copy': '© 2026 {name}. All rights reserved.',
    'home__lede': '{tagline}',
    'bento__desc__2': '{roles}',
    'bento__badge-tag': '{role0}',
}

OWNER_NAME = 'Jhuriel Guerra'
OWNER_FIRST = 'Jhuriel'


def substitute(value, ident):
    if not isinstance(value, str):
        return value
    v = value.replace(OWNER_NAME, ident['name'])
    v = v.replace(OWNER_FIRST, ident['name'])
    v = v.replace('pawsops', ident['slug'])
    return v


def build_content(page, ident):
    raw = json.load(open(f"{DST}/{page}.json", encoding='utf-8'))
    roles = ', '.join(ident['roles'])
    fmt = {'name': ident['name'], 'tagline': ident['tagline'], 'roles': roles,
           'role0': ident['roles'][0] if ident['roles'] else ident['name']}
    out = {}
    for k, v in raw.items():
        if k in OVERRIDES:
            out[k] = OVERRIDES[k].format(**fmt)
            continue
        if isinstance(v, dict):
            out[k] = {kk: substitute(vv, ident) for kk, vv in v.items()}
        else:
            out[k] = substitute(v, ident)
    return out


idents = [dict(OWNER, slug='jhuriel')] + [dict(v, slug=k) for k, v in MEMBERS.items()]

for i, ident in enumerate(idents):
    slug = ident['slug']
    lines = [
        "-- ============================================================",
        f"-- MIGRATION: correct portfolio content for '{slug}'",
        "-- The extractor used to store a card link's whole text_content() as",
        "-- its label, which applyContent then injected into the card.",
        "-- ============================================================",
        "",
        "insert into public.portfolio_pages (member_id, page_key, content)",
        "select m.id, v.page_key, v.content::jsonb",
        "from public.members m",
        "join (values",
    ]
    rows = []
    for page in PAGES:
        content = build_content(page, ident)
        compact = json.dumps(content, ensure_ascii=False, separators=(',', ':'))
        rows.append(f"  ('{slug}', '{page}', '{compact.replace(chr(39), chr(39)*2)}'::text)")
    lines.append(",\n".join(rows))
    lines += [
        ") as v(slug, page_key, content) on v.slug = m.slug",
        "on conflict (member_id, page_key) do update",
        "  set content = excluded.content, updated_at = now();",
        "",
    ]
    out = os.path.join(OUTDIR, f"01{i+4}_fix_portfolio_{slug}.sql")
    open(out, 'w', encoding='utf-8').write('\n'.join(lines))
    print(f"wrote {os.path.basename(out)} ({os.path.getsize(out)} bytes)")
