import { useEffect, useState } from 'react'
import {
  buildPageDocument,
  fetchRegions,
  fetchTemplate,
  pageSrcdoc,
} from './portfolio.js'

/**
 * Renders a member's portfolio page inside an iframe.
 *
 * The template + content are merged into a standalone document, so the
 * replica's CSS and JS run exactly as they do standalone. The replica is a
 * fixed-viewport app shell, so the iframe keeps a viewport-sized height and
 * the page scrolls inside it (as it does on its own).
 */
export default function PortfolioView({ slug, page, content, regions: regionsProp }) {
  const [srcdoc, setSrcdoc] = useState('')
  const [error, setError] = useState('')

  // Build the document whenever the page or its content changes.
  useEffect(() => {
    let cancelled = false
    setError('')
    ;(async () => {
      try {
        const [template, regions] = await Promise.all([
          fetchTemplate(page),
          regionsProp ? Promise.resolve(regionsProp) : fetchRegions(page),
        ])
        const doc = buildPageDocument({ template, regions, content, slug })
        if (!cancelled) setSrcdoc(pageSrcdoc(doc, { title: `${slug} · ${page}` }))
      } catch (e) {
        if (!cancelled) setError(e.message || 'Failed to load the portfolio page.')
      }
    })()
    return () => { cancelled = true }
  }, [slug, page, content, regionsProp])

  if (error) {
    return (
      <div style={{ padding: 40, color: 'var(--paws-muted)' }}>
        {error}
      </div>
    )
  }

  return (
    <iframe
      srcDoc={srcdoc}
      title={`Portfolio — ${page}`}
      style={{
        width: '100%',
        height: 'calc(100vh - 48px)',
        minHeight: 560,
        border: 'none',
        display: 'block',
        background: 'transparent',
      }}
    />
  )
}
