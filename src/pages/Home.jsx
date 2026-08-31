import { useEffect, useState } from 'react'
import { supabase, supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Home() {
  const [members, setMembers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); setErr('Supabase not configured.'); return }
    const db = requireSupabase()
    ;(async () => {
      try {
        const [{ data: m }, { data: t }] = await Promise.all([
          db.from('members').select('*').eq('published', true).order('display_order'),
          db.from('testimonials').select('*').eq('published', true).order('display_order'),
        ])
        setMembers(m || [])
        setTestimonials(t || [])
      } catch (e) { setErr(e.message) }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="wrap">
      <Nav />
      <section className="hero">
        <h1>Real people.<br />Real work that <span className="pink">delivers</span>.</h1>
        <p>
          PAWS — Professional Allied Workforce Services. A coordinated team of
          multi-skilled professionals, deployed on the work that actually moves
          your business forward.
        </p>
        <a className="btn btn-pink" href="#work">Work with us</a>
      </section>

      <section className="section">
        <h2>The team</h2>
        {err && <p style={{ color: 'var(--paws-muted)' }}>{err}</p>}
        {loading ? (
          <p>Loading…</p>
        ) : members.length === 0 ? (
          <p>No published members yet.</p>
        ) : (
          <div className="team-row">
            {members.map((m) => (
              <a key={m.id} className="member-card" href={`/team/${m.slug}`}>
                {m.photo_std ? (
                  <img className="member-photo" src={m.photo_std} alt={m.display_name} />
                ) : (
                  <div className="member-photo" />
                )}
                <h3>{m.display_name}</h3>
                <div className="role">{m.tagline || (m.role_tags || []).join(' · ')}</div>
              </a>
            ))}
          </div>
        )}
      </section>

      {testimonials.length > 0 && (
        <section className="section">
          <h2>What clients say</h2>
          {testimonials.map((t) => (
            <blockquote key={t.id} style={{ borderLeft: '2px solid var(--paws-pink)', paddingLeft: 20, margin: '24px 0' }}>
              <p style={{ fontSize: 19 }}>“{t.body}”</p>
              <footer style={{ color: 'var(--paws-muted)' }}>— {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</footer>
            </blockquote>
          ))}
        </section>
      )}

      <section className="section" id="work">
        <h2>Work with us</h2>
        <p>Tell us what you need. Book a discovery call or send a message — we'll respond like the professionals we are.</p>
        <div style={{ border: '1px dashed var(--paws-line)', padding: 32, color: 'var(--paws-muted)' }}>
          [ GHL calendar + chat widget embed — Phase 4 ]
        </div>
        <a className="btn" href="#contact" style={{ marginTop: 24 }}>Or send a message</a>
      </section>

      <Footer />
    </div>
  )
}
