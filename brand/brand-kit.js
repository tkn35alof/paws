/**
 * PAWS Brand Kit — runtime client.
 *
 * Canonical source of truth: brand/paws-brand-kit.json
 * Database mirror:          Supabase table `brand_kit` (public read)
 *
 * Three ways to use it:
 *
 *   1) Static import (no network, works anywhere — Node, browser, build tools):
 *      import { brandKit } from '../brand/brand-kit.js'
 *      brandKit.color.accent.pink.value   // '#ff5a8a'
 *
 *   2) CSS custom properties (inject the whole system into :root):
 *      import { brandKitToCssVars } from '../brand/brand-kit.js'
 *      brandKitToCssVars()  // returns a CSS string
 *
 *   3) Live from Supabase (single source of truth across every app):
 *      import { fetchBrandKit } from '../brand/brand-kit.js'
 *      const kit = await fetchBrandKit(supabase)
 *      kit.color.accent.pink.value
 */

import kit from './paws-brand-kit.json' with { type: 'json' }

/** The full brand kit object. */
export const brandKit = kit

/** Flat token lookup: brandKitToken('color.accent.pink') -> '#ff5a8a' */
export function brandKitToken(path) {
  return path.split('.').reduce((node, key) => node?.[key], kit)
}

/** Resolve a token's value: brandKitValue('color.accent.pink') -> '#ff5a8a' */
export function brandKitValue(path) {
  const node = brandKitToken(path)
  return node && typeof node === 'object' && 'value' in node ? node.value : node
}

/**
 * Convert the kit into the exact CSS custom properties used by src/index.css.
 * Drop the result into a <style> tag or a .css file — it is a drop-in for the
 * :root block, so the kit can regenerate the whole design system.
 *
 * Name mapping (matches index.css exactly):
 *   color surfaces/lines/accent/secondary/text  -> --paws-<key>
 *   typography families                         -> --font-<key>
 *   spacing                                     -> --space-<key>
 *   radius                                      -> --radius-<key>
 */
export function brandKitToCssVars() {
  const vars = []

  // Colors: the group name is NOT part of the variable name.
  for (const items of Object.values(kit.color)) {
    for (const [key, obj] of Object.entries(items)) {
      vars.push(`  --paws-${key}: ${obj.value};`)
    }
  }

  // Typography families use the bare --font-* namespace.
  for (const [key, obj] of Object.entries(kit.typography.families)) {
    vars.push(`  --font-${key}: ${obj.value};`)
  }

  for (const [key, obj] of Object.entries(kit.spacing)) {
    vars.push(`  --space-${key}: ${obj.value};`)
  }

  for (const [key, obj] of Object.entries(kit.radius)) {
    vars.push(`  --radius-${key}: ${obj.value};`)
  }

  return `:root {\n${vars.join('\n')}\n}`
}

/**
 * Fetch the live brand kit from Supabase.
 * Returns the same shape as the static `brandKit` object.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<object>}
 */
export async function fetchBrandKit(supabase) {
  const { data, error } = await supabase
    .from('brand_kit')
    .select('category, group_name, key, value, usage, meta')
    .order('category')

  if (error) throw new Error(`brand_kit fetch failed: ${error.message}`)
  if (!data?.length) throw new Error('brand_kit is empty — run migration 007_brand_kit.sql')

  return rowsToKit(data)
}

/** Rebuild the nested kit object from flat brand_kit rows. */
export function rowsToKit(rows) {
  const out = {}

  for (const row of rows) {
    const { category, group_name, key, value, usage, meta } = row

    if (category === 'component' && key.includes('.')) {
      // component rows: group_name = component, key = "variant.prop"
      const [variant, prop] = key.split('.')
      out[category] ??= {}
      out[category][group_name] ??= {}
      out[category][group_name][variant] ??= {}
      out[category][group_name][variant][prop] = value
      continue
    }

    out[category] ??= {}
    out[category][group_name] ??= {}

    // Numeric-looking values stay numbers; JSON-looking values parse.
    let parsed = value
    if (typeof value === 'string' && value.match(/^-?\d+(\.\d+)?$/)) {
      parsed = Number(value)
    } else if (typeof value === 'string' && value.startsWith('[')) {
      try { parsed = JSON.parse(value) } catch { /* keep string */ }
    }

    out[category][group_name][key] = usage ? { value: parsed, usage, ...(meta || {}) } : parsed
  }

  return out
}

/** Tailwind-style token map for utility-class generation. */
export function brandKitToTailwind() {
  const colors = {}
  for (const [group, items] of Object.entries(kit.color)) {
    for (const [key, obj] of Object.entries(items)) {
      colors[`${group}-${key}`] = obj.value
    }
  }

  const fontFamily = {}
  for (const [key, obj] of Object.entries(kit.typography.families)) {
    fontFamily[key] = obj.value.split(',').map((f) => f.trim().replace(/'/g, ''))
  }

  const spacing = {}
  for (const [key, obj] of Object.entries(kit.spacing)) {
    spacing[key] = obj.value
  }

  const borderRadius = {}
  for (const [key, obj] of Object.entries(kit.radius)) {
    borderRadius[key] = obj.value
  }

  return { colors, fontFamily, spacing, borderRadius }
}

export default brandKit
