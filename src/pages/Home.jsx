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
    <>
      <div className="wrap">
        <Nav />

        <section className="hero">
          <h1>
            Real people.<br />
            Real work that <span className="accent">delivers</span>.
          </h1>
          <p>
            PAWS — Professional Allied Workforce Services. A coordinated team of
            multi-skilled professionals, deployed on the work that actually moves
            your business forward.
          </p>
          <a className="btn btn-pink" href="#work">Work with us</a>
          <div className="meta">
            <span className="meta-item"><span className="dot" />7 specialists, 1 team</span>
            <span className="meta-item">International clients</span>
            <span className="meta-item">GHL + Web + Ops</span>
          </div>
        </section>
      </div>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">The team</div>
              <h2>Specialists, not freelancers.</h2>
            </div>
          </div>
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
                  {m.role_tags?.length > 0 && (
                    <div className="tags">
                      {m.role_tags.slice(0, 3).map((r) => <span key={r} className="tag">{r}</span>)}
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="section-head">
              <div>
                <div className="kicker">Testimonials</div>
                <h2>What clients say</h2>
              </div>
            </div>
            {testimonials.map((t) => (
              <blockquote key={t.id} className="testimonial">
                <p>“{t.body}”</p>
                <footer className="who">— {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</footer>
              </blockquote>
            ))}
          </div>
        </section>
      )}

      <section className="section" id="work">
        <div className="wrap">
          <div className="section-head">
            <div>
              <div className="kicker">Work with us</div>
              <h2>Book a discovery call.</h2>
              <p style={{ maxWidth: 600, marginTop: 12 }}>
                Tell us what you need below. We read every message and reply like the professionals we are.
              </p>
            </div>
          </div>

          <div style={{ overflow: 'hidden', maxWidth: 1100, margin: '0 auto' }}>
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
        </div>
      </section>

      <Footer />
    </>
  )
}
