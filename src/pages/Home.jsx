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

      {/* Marquee — skill badges scrolling */}
      <div className="marquee-fade" style={{ marginTop: 40 }}>
        <div className="marquee">
          {['GHL', 'React', 'TypeScript', 'Supabase', 'Node.js', 'Vercel', 'Web Design', 'Automation', 'Inbox Triage', 'Data Sync', 'API Integration', 'Client Success'].map((skill) => (
            <span key={skill} style={{ whiteSpace: 'nowrap', padding: '8px 18px', border: '1px solid var(--paws-line-2)', borderRadius: 'var(--radius-pill)', color: 'var(--paws-ink-2)', fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.7 }}>{skill}</span>
          ))}
          {['GHL', 'React', 'TypeScript', 'Supabase', 'Node.js', 'Vercel', 'Web Design', 'Automation', 'Inbox Triage', 'Data Sync', 'API Integration', 'Client Success'].map((skill) => (
            <span key={skill} style={{ whiteSpace: 'nowrap', padding: '8px 18px', border: '1px solid var(--paws-line-2)', borderRadius: 'var(--radius-pill)', color: 'var(--paws-ink-2)', fontFamily: 'var(--font-mono)', fontSize: 13, opacity: 0.7 }}>{skill}</span>
          ))}
        </div>
      </div>

      {/* Integration logos grid — screenshot 1 style */}
      <section className="section" style={{ padding: '80px 0' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, marginBottom: 12 }}>Connect with the tools your team already uses.</h2>
            <p style={{ color: 'var(--paws-ink-2)', maxWidth: 560, margin: '0 auto' }}>We integrate with 100+ platforms so your workflows never skip a beat.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 24, alignItems: 'center', justifyItems: 'center', opacity: 0.8 }}>
            {[
              { name: 'GoHighLevel', color: '#ea580c' },
              { name: 'React', color: '#61dafb' },
              { name: 'TypeScript', color: '#3178c6' },
              { name: 'Supabase', color: '#3ecf8e' },
              { name: 'Node.js', color: '#68a063' },
              { name: 'Vercel', color: '#fff' },
              { name: 'Stripe', color: '#635bff' },
              { name: 'Zapier', color: '#f45134' },
              { name: 'Mailchimp', color: '#f45134' },
              { name: 'Shopify', color: '#7ea45a' },
              { name: 'Slack', color: '#4a1e4e' },
              { name: 'HubSpot', color: '#ff7a18' },
            ].map((tool) => (
              <div key={tool.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: tool.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{tool.name[0]}</div>
                <span style={{ fontSize: 12, color: 'var(--paws-ink-3)', fontFamily: 'var(--font-mono)' }}>{tool.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards grid — screenshot 2 style */}
      <section className="section" style={{ padding: '80px 0' }}>
        <div className="wrap">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 32, marginBottom: 12 }}>Everything your team needs to deliver.</h2>
            <p style={{ color: 'var(--paws-ink-2)', maxWidth: 560, margin: '0 auto' }}>Built for professionals who need power without the bloat.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: '⚡', title: 'Setup Everything Fast', desc: 'Get your workspace configured and ready in minutes, not days.' },
              { icon: '📅', title: 'Schedule Campaign', desc: 'Automated campaigns that reach the right people at the right time.' },
              { icon: '📊', title: 'Live Reports', desc: 'Real-time dashboards showing exactly what is working and what needs attention.' },
              { icon: '💬', title: 'Chat Module in Website', desc: 'Embedded chat so clients reach you instantly without leaving the page.' },
              { icon: '🛍️', title: 'Unlimited Products', desc: 'No caps on what you can list, sell, or manage through our platform.' },
              { icon: '👥', title: 'Collect Information', desc: 'Smart forms that capture leads and route them to the right team member.' },
            ].map((f) => (
              <div key={f.title} style={{ border: '1px solid var(--paws-line-2)', borderRadius: 'var(--radius-lg)', background: 'rgba(14, 14, 24, 0.6)', padding: 32, backdropFilter: 'blur(8px)', transition: 'border-color .3s ease, transform .3s ease' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--paws-pink)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--paws-line-2)'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(255, 90, 138, 0.15), rgba(255, 90, 138, 0.05))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 20, transition: 'transform .3s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-8px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                >{f.icon}</div>
                <h3 style={{ fontSize: 20, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--paws-ink-2)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              background: 'rgba(14, 14, 24, 0.6)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              overflow: 'hidden',
              height: 710,
              borderRadius: 'var(--radius-card)',
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

          {/* Stats row */}
          <div className="wrap" style={{ marginTop: 60 }}>
            <div className="stats-row">
              <div className="stat-item glass-card">
                <div className="stat-number">7</div>
                <div className="stat-label">Specialists</div>
              </div>
              <div className="stat-item glass-card">
                <div className="stat-number">15K+</div>
                <div className="stat-label">Clients served</div>
              </div>
              <div className="stat-item glass-card">
                <div className="stat-number">24/7</div>
                <div className="stat-label">Availability</div>
              </div>
              <div className="stat-item glass-card">
                <div className="stat-number">100%</div>
                <div className="stat-label">On-time delivery</div>
              </div>
            </div>
          </div>

          {/* Vertical marquee testimonials */}
          <div className="wrap" style={{ marginTop: 60, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
            <div>
              <div className="kicker" style={{ marginBottom: 12 }}>What clients say</div>
              <h2 style={{ marginBottom: 32 }}>Trusted by teams worldwide.</h2>
              <div className="marquee-v-fade" style={{ height: 480, overflow: 'hidden' }}>
                <div className="marquee-vertical">
                  {[
                    { name: 'Sarah Chen', text: "PAWS transformed our operations. The GHL integration alone saved us 15 hours a week.", role: 'Ops Director' },
                    { name: 'Marcus Lee', text: "Finally, a team that actually delivers. No fluff, just real work.", role: 'Founder' },
                    { name: 'Priya Patel', text: "The portal is beautiful and the team responds instantly. Best hire we made this year.", role: 'CTO' },
                    { name: 'David Kim', text: "Scalable, professional, and exactly what we needed. Couldn't recommend more.", role: 'VP Engineering' },
                    { name: 'Sarah Chen', text: "PAWS transformed our operations. The GHL integration alone saved us 15 hours a week.", role: 'Ops Director' },
                    { name: 'Marcus Lee', text: "Finally, a team that actually delivers. No fluff, just real work.", role: 'Founder' },
                    { name: 'Priya Patel', text: "The portal is beautiful and the team responds instantly. Best hire we made this year.", role: 'CTO' },
                    { name: 'David Kim', text: "Scalable, professional, and exactly what we needed. Couldn't recommend more.", role: 'VP Engineering' },
                  ].map((t, i) => (
                    <div key={i} style={{ border: '1px solid var(--paws-line)', borderRadius: 'var(--radius-lg)', background: 'rgba(14, 14, 24, 0.6)', padding: 24, backdropFilter: 'blur(8px)' }}>
                      <p style={{ margin: 0, color: 'var(--paws-ink)', fontSize: 16, lineHeight: 1.6, fontStyle: 'italic' }}>"{t.text}"</p>
                      <p style={{ margin: '12px 0 0', color: 'var(--paws-pink)', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 500 }}>- {t.name}</p>
                      <p style={{ margin: 0, color: 'var(--paws-ink-3)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{t.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ position: 'relative', height: 500 }}>
              <div className="glow-blob pink" style={{ position: 'absolute', top: '10%', left: '10%' }}></div>
              <div className="glow-blob deep" style={{ position: 'absolute', bottom: '20%', right: '10%' }}></div>
              <div className="glass-card" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 40 }}>
                <div className="border-pill" style={{ marginBottom: 24, width: 'fit-content' }}><span>Why PAWS</span></div>
                <h2 style={{ fontSize: 32, marginBottom: 16 }}>Real people.<br />Real work that <span style={{ color: 'var(--paws-pink)' }}>delivers</span>.</h2>
                <p style={{ color: 'var(--paws-ink-2)', marginBottom: 24 }}>A coordinated team of multi-skilled professionals deployed on the work that actually moves your business forward.</p>
                <a href="#work" className="btn">Work with us</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  )
}
