# PAWS Brand Kit

Canonical design tokens for Professional Allied Workforce Services. One source of truth, usable everywhere.

**Live site:** https://paws-temp.vercel.app  
**Supabase table:** `public.brand_kit`  
**Migration:** `supabase/migrations/007_brand_kit.sql`

---

## Source of truth

`brand/paws-brand-kit.json` is the only file you edit. Everything else is generated or fetched.

```
paws-brand-kit.json          ← edit this
        │
        ├──generate_brand_kit.py──▶ supabase/migrations/007_brand_kit.sql
        │                                  │
        │                                  ▼
        │                           Supabase brand_kit table
        │                                  │
        └──brand-kit.js (static)──────────┘
              brand-kit.js (fetch)  ← any app queries the live table
```

## Regenerate after editing

```bash
python brand/generate_brand_kit.py
supabase db push --project-ref snqupfxdrbwwxmmytynb
```

## Usage

### 1. Static import — no network

```js
import { brandKit, brandKitValue, brandKitToCssVars } from '../brand/brand-kit.js'

brandKit.color.accent.pink.value        // '#ff5a8a'
brandKitValue('typography.families.display') // "'Space Grotesk', 'Segoe UI', system-ui, sans-serif"
brandKit.typography.scale.h1.value      // 'clamp(48px, 10vw, 104px)'
```

### 2. Inject CSS custom properties

```js
import { brandKitToCssVars } from '../brand/brand-kit.js'

const style = document.createElement('style')
style.textContent = brandKitToCssVars()
document.head.appendChild(style)
```

### 3. Live from Supabase

```js
import { fetchBrandKit } from '../brand/brand-kit.js'

const kit = await fetchBrandKit(supabase)
kit.color.accent.pink.value
```

### 4. Tailwind / utility config

```js
import { brandKitToTailwind } from '../brand/brand-kit.js'

export default {
  theme: { extend: brandKitToTailwind() }
}
```

### 5. Query SQL directly

```sql
-- every color
select * from public.v_brand_colors;

-- one token
select value, usage from public.brand_kit
where category = 'color' and key = 'pink';

-- everything
select * from public.v_brand_all;
```

---

## What's inside

| Category | Tokens | Examples |
|---|---|---|
| `color` | 21 | `void`, `surface`, `line`, `pink`, `pink-deep`, `pink-glow`, `ink`, `ink-2`, `cyan` |
| `typography` | 26 | `font-display`, `font-body`, `font-mono`, scale, weights, letter-spacing |
| `spacing` | 10 | `--space-1` … `--space-10` |
| `radius` | 5 | `sm`, `md`, `lg`, `card`, `pill` |
| `shadow` | 7 | `nav`, `card-hover`, `btn`, `focus-ring`, `border-glow` |
| `motion` | 13 | durations, easings, keyframes |
| `layout` | 10 | `maxWidth`, `sectionPadding`, breakpoints |
| `component` | 45 | button, nav, card, input, tag, kicker |
| `voice` | 4 | tone, headline style, avoid list, taglines |
| `asset` | 3 | font URL, logo mark, favicon note |

---

## Design principles

1. **Dark void base** with layered atmospheric surfaces
2. **Glassmorphism** — translucent surfaces over blurred backdrops
3. **One accent color** (pink `#ff5a8a`) used sparingly for maximum impact
4. **Mono type** for labels, tags, and meta information
5. **No AI slop** — no purple-blue gradients, no generic sans, no bubble-wrap

---

## Accessibility

Contrast ratios are stored in each color token's `meta.contrastOn`:

| Token | On | Ratio |
|---|---|---|
| `pink` | `void` | 6.77 |
| `pink` | `surface` | 6.47 |
| `ink` | `void` | 18.46 |
| `ink-2` | `surface` | 7.5 |
| `cyan` | `void` | 13.03 |

`ink-3` on `surface` is 3.65 — use for non-essential text only.

---

## Access control

- **Read:** public (`anon`, `authenticated`) — brand tokens are not sensitive
- **Write:** owner only (`public.is_owner()`)

Never put secrets in the brand kit.
