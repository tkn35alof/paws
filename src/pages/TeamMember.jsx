import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function TeamMember() {
  const { slug } = useParams()
  const [m, setM] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    const db = requireSupabase()
    ;(async () => {
      const { data } = await db.from('members').select('*').eq('slug', slug).eq('published', true).single()
      setM(data)
      setLoading(false)
    })()
  }, [slug])

  if (loading) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Loading…</p></div>
  if (!m) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Member not found.</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section" style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
        {m.photo_std ? (
          <img src={m.photo_std} alt={m.display_name} style={{ width: 320, height: 400, objectFit: 'cover', border: '1px solid var(--paws-line)' }} />
        ) : (
          <div style={{ width: 320, height: 400, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)' }} />
        )}
        <div style={{ flex: 1, minWidth: 300 }}>
          <h1>{m.display_name}</h1>
          {m.tagline && <p className="pink" style={{ fontSize: 20 }}>{m.tagline}</p>}
          {m.featured_metric && (
            <span style={{
              display: 'inline-block', marginTop: 12, padding: '6px 18px',
              border: '1px solid var(--paws-pink)', borderRadius: 999,
              background: 'rgba(255, 90, 138, 0.1)', color: 'var(--paws-pink)',
              fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700,
              boxShadow: '0 0 12px rgba(255, 90, 138, 0.4)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              ⚡ {m.featured_metric}
            </span>
          )}
          {m.bio && <p style={{ maxWidth: 560 }}>{m.bio}</p>}
          {m.role_tags?.length > 0 && <div>{m.role_tags.map((r) => <span key={r} className="tag">{r}</span>)}</div>}
          {m.skills?.length > 0 && <div style={{ marginTop: 16 }}>{m.skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>}
          {m.workflow_video_url && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 14, color: 'var(--paws-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Workflow Walkthrough</h3>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--paws-line)' }}>
                <iframe
                  src={m.workflow_video_url.includes('loom.com') ? `${m.workflow_video_url.replace('/share/', '/embed/')}` : m.workflow_video_url.includes('youtube.com') || m.workflow_video_url.includes('youtu.be') ? m.workflow_video_url : m.workflow_video_url}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullscreen
                  title="Workflow video"
                />
              </div>
            </div>
          )}
          {m.featured_project && (
            <div style={{ marginTop: 24 }}>
              <a className="btn btn-pink" href={m.featured_project} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 28px', fontSize: 15 }}>
                🚀 View Featured Automation Project
              </a>
            </div>
          )}
          {m.links && Object.keys(m.links).length > 0 && (
            <div style={{ marginTop: 24 }}>
              {Object.entries(m.links).map(([k, v]) => v && <a key={k} className="btn" style={{ marginRight: 12 }} href={v}>{k}</a>)}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  )
}
