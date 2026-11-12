import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import PortfolioView from './PortfolioView.jsx'
import {
  PAGES,
  preloadPages,
  getCachedContent,
  setCachedContent,
  warmContentCache,
} from './portfolio.js'

/**
 * Public member portfolio: /portfolio/:slug/:page
 *
 * Reads the member (published only) and their saved portfolio content for the
 * requested page, then renders the replica template with that content.
 */
export default function PortfolioPage() {
  const { slug, page = 'home' } = useParams()
  const navigate = useNavigate()
  const [member, setMember] = useState(null)
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const pageMeta = PAGES.find((p) => p.key === page)

  // The replica's own nav links post a message here so the PAWS app navigates
  // instead of the iframe navigating itself (which nests a new SPA).
  useEffect(() => {
    function onMessage(e) {
      if (e.data && e.data.type === 'paws:portfolio-nav' && e.data.href) {
        navigate(e.data.href)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [navigate])

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); setError('Supabase not configured.'); return }
    let cancelled = false
    setMember(null)
    ;(async () => {
      const { data: m, error: mErr } = await requireSupabase()
        .from('members')
        .select('id, slug, display_name, tagline, published')
        .eq('slug', slug)
        .eq('published', true)
        .single()
      if (cancelled) return
      if (mErr || !m) { setError('Member not found.'); setLoading(false); return }
      setMember(m)
      // Warm the templates and every page's content (one query) so clicking
      // through the rail is a local cache hit instead of a round-trip.
      preloadPages()
      const { data: rows } = await requireSupabase()
        .from('portfolio_pages')
        .select('page_key, content')
        .eq('member_id', m.id)
      if (!cancelled && rows) warmContentCache(m.id, rows)
    })()
    return () => { cancelled = true }
  }, [slug])

  useEffect(() => {
    if (!member) return
    let cancelled = false
    const cached = getCachedContent(member.id, page)
    if (cached) {
      setContent(cached)
      setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      const { data: rows, error: pErr } = await requireSupabase()
        .from('portfolio_pages')
        .select('content')
        .eq('member_id', member.id)
        .eq('page_key', page)
        .single()
      if (cancelled) return
      if (pErr || !rows) {
        setError('This portfolio page has not been published yet.')
        setLoading(false)
        return
      }
      const c = rows.content || {}
      setCachedContent(member.id, page, c)
      setContent(c)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [member, page])

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
