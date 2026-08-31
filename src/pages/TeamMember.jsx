import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function TeamMember() {
  const { slug } = useParams()
  const [m, setM] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('members').select('*').eq('slug', slug).eq('published', true).single()
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
          {m.bio && <p style={{ maxWidth: 560 }}>{m.bio}</p>}
          {m.role_tags?.length > 0 && <div>{m.role_tags.map((r) => <span key={r} className="tag">{r}</span>)}</div>}
          {m.skills?.length > 0 && <div style={{ marginTop: 16 }}>{m.skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>}
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
