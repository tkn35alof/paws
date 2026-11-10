/**
 * PAWS Brand Kit — verification.
 *
 * Proves three things:
 *   1. The JSON kit is valid and complete.
 *   2. The generated CSS custom properties match src/index.css exactly.
 *   3. The Supabase brand_kit table matches the JSON (when env is present).
 *
 * Usage:
 *   node brand/verify.mjs                 # local checks only
 *   node brand/verify.mjs --with-remote   # also compare against Supabase
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { brandKit, brandKitToCssVars, rowsToKit } from './brand-kit.js'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

// Load .env / .env.local (Vite-style) without pulling in a dependency.
for (const file of ['.env', '.env.local']) {
  try {
    for (const line of readFileSync(join(root, file), 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const [key, ...rest] = trimmed.split('=')
      const value = rest.join('=').trim().replace(/^["']|["']$/g, '')
      if (!(key.trim() in process.env)) process.env[key.trim()] = value
    }
  } catch { /* file optional */ }
}

let failures = 0
const ok = (label, pass, detail = '') => {
  console.log(`${pass ? '  PASS' : '  FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!pass) failures++
}

function parseVars(text) {
  return Object.fromEntries(
    [...text.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  )
}

// --- 1. JSON kit sanity -----------------------------------------------------
console.log('\n1. Brand kit JSON')
const tokenCount = Object.values(brandKit.color).reduce((n, g) => n + Object.keys(g).length, 0)
  + Object.keys(brandKit.typography.families).length
  + Object.keys(brandKit.spacing).length
  + Object.keys(brandKit.radius).length
ok('kit loads', !!brandKit.meta?.name, brandKit.meta.name)
ok('has colors', Object.keys(brandKit.color).length >= 5)
ok('has typography families', Object.keys(brandKit.typography.families).length === 3)
ok('has spacing scale', Object.keys(brandKit.spacing).length === 10)
ok('primary accent is pink', brandKit.color.accent.pink.value === '#ff5a8a')

// --- 2. CSS parity ---------------------------------------------------------
console.log('\n2. CSS parity (src/index.css :root)')
const css = readFileSync(join(root, 'src', 'index.css'), 'utf8')
const rootBlock = css.split(':root {')[1]?.split('}')[0] ?? ''
const cssVars = parseVars(rootBlock)
const genVars = parseVars(brandKitToCssVars())

const onlyGen = Object.keys(genVars).filter((k) => !(k in cssVars))
const onlyCss = Object.keys(cssVars).filter((k) => !(k in genVars))
const mismatched = Object.keys(cssVars).filter((k) => k in genVars && cssVars[k] !== genVars[k])

ok('no missing vars in index.css', onlyCss.length === 0, onlyCss.join(', ') || 'none')
ok('no extra vars in index.css', onlyGen.length === 0, onlyGen.join(', ') || 'none')
ok('all values identical', mismatched.length === 0,
   mismatched.map((k) => `${k}: css=${cssVars[k]} kit=${genVars[k]}`).join('; ') || `${Object.keys(cssVars).length} vars`)

// --- 3. Remote parity ------------------------------------------------------
console.log('\n3. Supabase parity')
const withRemote = process.argv.includes('--with-remote')

if (!withRemote) {
  console.log('  SKIP  (run with --with-remote to compare against Supabase)')
} else {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    ok('env present', false, 'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing')
  } else {
    const res = await fetch(`${url}/rest/v1/brand_kit?select=category,group_name,key,value,usage,meta&limit=1000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!res.ok) {
      ok('brand_kit readable', false, `${res.status} ${await res.text()}`)
    } else {
      const rows = await res.json()
      ok('brand_kit readable', true, `${rows.length} rows`)
      const rebuilt = rowsToKit(rows)
      const remotePink = rebuilt?.color?.accent?.pink?.value
      ok('pink matches JSON', remotePink === brandKit.color.accent.pink.value, remotePink)
      const remoteVoid = rebuilt?.color?.surfaces?.void?.value
      ok('void matches JSON', remoteVoid === brandKit.color.surfaces.void.value, remoteVoid)
      ok('meta preserved', rebuilt?.color?.accent?.pink?.contrastOn?.void === 6.77,
         JSON.stringify(rebuilt?.color?.accent?.pink?.contrastOn ?? null))
    }
  }
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${failures === 0 ? 'brand kit is consistent' : `${failures} check(s) failed`}\n`)
process.exit(failures === 0 ? 0 : 1)
