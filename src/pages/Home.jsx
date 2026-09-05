import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
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
        <p>
          Tell us what you need. Book a discovery call below, or send a message — we'll respond like the professionals we are.
        </p>

        <div style={{ marginTop: 0, marginBottom: 48, overflow: 'hidden', maxWidth: 1100, margin: '0 auto' }}>
          <h3 style={{ fontSize: 20, marginBottom: 12 }}>Book a discovery call</h3>
          <div style={{
            border: '1px solid var(--paws-line)',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            height: 710,
          }}>
            <iframe
              src="https://api.leadconnectorhq.com/widget/booking/YrYXL1dDWGNvci77AyUb"
              style={{ width: '100%', height: 710, border: 'none', display: 'block' }}
              scrolling="auto"
              id="YrYXL1dDWGNvci77AyUb_1788371872912"
              title="Book a discovery call"
              loading="lazy"
            />
          </div>
          <script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript" async></script>
        </div>

        <p style={{ color: 'var(--paws-muted)', fontSize: 14, textAlign: 'center', marginTop: 16 }}>
          Prefer to chat first? Use the chat bubble in the bottom-right corner.
        </p>
      </section>

      <Footer />

      {/* GHL chat widget — loads site-wide as a floating bubble */}
      <script
        src="https://widgets.leadconnectorhq.com/loader.js"
        data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
        data-widget-id="6a9863fe673e2602e6988a68"
        async
      />
    </div>
  )
}
