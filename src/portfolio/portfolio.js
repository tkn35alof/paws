// Portfolio template engine.
//
// The replica's pages are stored as static templates (public/portfolio-assets/
// templates/<page>.html) with `data-pf-key` attributes marking every editable
// element. A member's content (JSON in the portfolio_pages table) is applied to
// the template at render time, and the result is displayed inside an iframe so
// the replica's own CSS/JS runs unchanged and cannot clash with the PAWS app.

export const ASSET_BASE = '/portfolio-assets'

export const PAGES = [
  { key: 'home', label: 'Home' },
  { key: 'projects', label: 'Projects' },
  { key: 'services', label: 'Services' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'about', label: 'About' },
  { key: 'contact', label: 'FAQs / Contact' },
]

/** Replace the text nodes of an element, preserving element children (icons). */
function setText(el, text) {
  const doc = el.ownerDocument
  let inserted = false
  for (const node of [...el.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!inserted) {
        node.nodeValue = text
        inserted = true
      } else {
        el.removeChild(node)
      }
    }
  }
  if (!inserted) el.appendChild(doc.createTextNode(text))
}

/** Apply a member's content to a parsed template document. */
export function applyContent(doc, regions, content) {
  if (!regions || !content) return
  for (const region of regions) {
    const el = doc.querySelector(region.selector)
    if (!el) continue
    const value = content[region.key]
    if (value == null) continue
    switch (region.type) {
      case 'text':
        setText(el, String(value))
        break
      case 'image':
        if (value.src != null) el.setAttribute('src', value.src)
        if (value.alt != null) el.setAttribute('alt', value.alt)
        break
      case 'link':
        if (value.label != null) setText(el, String(value.label))
        if (value.href != null) el.setAttribute('href', value.href)
        break
      default:
        break
    }
  }
}

/** Point the replica's internal page links at the PAWS portfolio routes. */
export function rewritePageLinks(doc, slug) {
  doc.querySelectorAll('a[href^="paws-member-portfolio-"]').forEach((a) => {
    const m = a.getAttribute('href').match(/^paws-member-portfolio-(\w+)\.html$/)
    if (m) a.setAttribute('href', `/portfolio/${slug}/${m[1]}`)
  })
}

/** Build a parsed document from a template + content. */
export function buildPageDocument({ template, regions, content, slug }) {
  const doc = new DOMParser().parseFromString(template, 'text/html')
  applyContent(doc, regions, content)
  rewritePageLinks(doc, slug)
  return doc
}

/** Wrap the body in a standalone document for the iframe. */
export function pageSrcdoc(doc, { title = 'Portfolio' } = {}) {
  const body = doc.body ? doc.body.innerHTML : ''
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="${ASSET_BASE}/portfolio.css">
<link rel="stylesheet" href="${ASSET_BASE}/paws-brand.css">
</head>
<body>
${body}
<script src="${ASSET_BASE}/portfolio.js"></script>
</body>
</html>`
}

/** Fetch a template from the static assets. */
export async function fetchTemplate(page) {
  const res = await fetch(`${ASSET_BASE}/templates/${page}.html`)
  if (!res.ok) throw new Error(`Template not found: ${page}`)
  return res.text()
}

/** Fetch the region descriptors for a page. */
export async function fetchRegions(page) {
  const res = await fetch(`${ASSET_BASE}/regions/${page}.json`)
  if (!res.ok) return []
  const data = await res.json()
  return data.regions || []
}
