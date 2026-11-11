import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import PortfolioView from './PortfolioView.jsx'
import { PAGES } from './portfolio.js'

/**
 * Public member portfolio: /portfolio/:slug/:page
 *
 * Reads the member (published only) and their saved portfolio content for the
 * requested page, then renders the replica template with that content.
 */
export default function PortfolioPage() {
  const { slug, page = 'home' } = useParams()
  const [member, setMember] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pageMeta = PAGES.find((p) => p.key === page)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); setError('Supabase not configured.'); return }
    const db = requireSupabase()
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const { data: m, error: mErr } = await db
        .from('members')
        .select('id, slug, display_name, tagline, published')
        .eq('slug', slug)
        .eq('published', true)
        .single()
      if (cancelled) return
      if (mErr || !m) { setError('Member not found.'); setLoading(false); return }
      setMember(m)
      const { data: rows, error: pErr } = await db
        .from('portfolio_pages')
        .select('content')
        .eq('member_id', m.id)
        .eq('page_key', page)
        .single()
      if (cancelled) return
      if (pErr || !rows) {
        setError('This portfolio page has not been published yet.')
        setLoading(false)
        return
      }
      setContent(rows.content)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [slug, page])

  if (loading) {
    return <div style={{ padding: 120, color: 'var(--paws-muted)' }}>Loading portfolio…</div>
  }
  if (error) {
    return (
      <div style={{ padding: 120 }}>
        <p style={{ color: 'var(--paws-muted)' }}>{error}</p>
        <Link className="btn" to="/">Back to PAWS</Link>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative' }}>
      <Link
        to={`/team/${slug}`}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 50,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(14,14,24,.85)', color: 'var(--paws-ink)',
          border: '1px solid var(--paws-line)', fontSize: 13,
          textDecoration: 'none', backdropFilter: 'blur(8px)',
        }}
      >
        ← Full profile
      </Link>
      <Link
        to="/"
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 50,
          padding: '8px 16px', borderRadius: 999,
          background: 'rgba(14,14,24,.85)', color: 'var(--paws-ink)',
          border: '1px solid var(--paws-line)', fontSize: 13,
          textDecoration: 'none', backdropFilter: 'blur(8px)',
        }}
      >
        ← Back to PAWS
      </Link>
      <PortfolioView slug={slug} page={page} content={content} />
    </div>
  )
}
