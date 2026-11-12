import { useCallback, useEffect, useRef, useState } from 'react'
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
 *
 * When `editable` is on, the iframe lets the member edit the content in place
 * (contenteditable text, popovers for image/link values) and posts each change
 * back through `onContentChange`. The document is not rebuilt while editing so
 * the caret and popover are never torn down mid-edit.
 */
export default function PortfolioView({
  slug,
  page,
  content,
  regions: regionsProp,
  height,
  editable = false,
  loading: loadingProp = false,
  onContentChange,
}) {
  const [srcdoc, setSrcdoc] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef(null)
  const builtRef = useRef(null)

  // Build the document for a page. Skipped while editing (the member is
  // editing the live DOM); re-runs when edit mode is switched off.
  useEffect(() => {
    if (
      editable &&
      builtRef.current &&
      builtRef.current.slug === slug &&
      builtRef.current.page === page
    ) {
      return
    }
    let cancelled = false
    setError('')
    setLoading(true)
    ;(async () => {
      try {
        const [template, regions] = await Promise.all([
          fetchTemplate(page),
          regionsProp ? Promise.resolve(regionsProp) : fetchRegions(page),
        ])
        const doc = buildPageDocument({ template, regions, content, slug })
        if (!cancelled) {
          setSrcdoc(pageSrcdoc(doc, { title: `${slug} · ${page}` }))
          builtRef.current = { slug, page }
        }
      } catch (e) {
        if (!cancelled) { setError(e.message || 'Failed to load the portfolio page.'); setLoading(false) }
      }
    })()
    return () => { cancelled = true }
  }, [slug, page, content, regionsProp, editable])

  // Safety: never let the loading veil stick if the iframe never reports load.
  useEffect(() => {
    if (!loading) return
    const t = setTimeout(() => setLoading(false), 6000)
    return () => clearTimeout(t)
  }, [loading])

  // Tell the iframe whether it is in edit mode.
  const sendEditMode = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'paws:portfolio-edit', enabled: !!editable },
      '*',
    )
  }, [editable])

  useEffect(() => {
    if (srcdoc) sendEditMode()
  }, [srcdoc, sendEditMode])

  // Receive inline edits.
  useEffect(() => {
    if (!onContentChange) return
    function onMessage(e) {
      if (!e.data || e.data.type !== 'paws:portfolio-change') return
      onContentChange(e.data.key, e.data.value, e.data.twins)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onContentChange])

  if (error) {
    return (
      <div style={{ padding: 40, color: 'var(--paws-muted)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcdoc}
        title={`Portfolio — ${page}`}
        onLoad={() => { setLoading(false); sendEditMode() }}
        style={{
          width: '100%',
          height: height || 'calc(100vh - 48px)',
          minHeight: 420,
          border: 'none',
          display: 'block',
          background: 'transparent',
        }}
      />
      {(loading || loadingProp) && !error && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          background: '#0b0b14',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            border: '3px solid rgba(255,90,138,.2)', borderTopColor: '#ff5a8a',
            animation: 'paws-spin 0.8s linear infinite',
          }} />
          <style>{'@keyframes paws-spin{to{transform:rotate(360deg)}}'}</style>
        </div>
      )}
    </div>
  )
}
