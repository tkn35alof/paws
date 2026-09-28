import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Home() {
  const [members, setMembers] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [logos, setLogos] = useState([])
  const [features, setFeatures] = useState([])
  const [testimonialDelays, setTestimonialDelays] = useState('0, -20, -40')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); setErr('Supabase not configured.'); return }
    const db = requireSupabase()
    ;(async () => {
      try {
        const [{ data: m }, { data: t }, { data: l }, { data: f }, { data: delays }] = await Promise.all([
          db.from('members').select('*').eq('published', true).order('display_order'),
          db.from('testimonials').select('*').eq('published', true).order('display_order'),
          db.from('integration_logos').select('*').eq('published', true).order('row_index').order('display_order'),
          db.from('features').select('*').eq('published', true).order('display_order'),
          db.from('site_content').select('body').eq('key', 'testimonial_marquee_delays').single(),
        ])
        setMembers(m || [])
        setTestimonials(t || [])
        setLogos(l || [])
        setFeatures(f || [])
        if (delays?.body) setTestimonialDelays(delays.body)
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

      {/* Integration logos marquee — Darkrise two-row staggered style */}
            <section className="section" style={{ padding: '80px 0' }}>
              <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                  <h2 style={{ fontSize: 32, marginBottom: 12 }}>Connect with 100+ tools</h2>
                  <p style={{ color: 'var(--paws-ink-2)', maxWidth: 560, margin: '0 auto' }}>Gain invaluable predictive analytics and actionable insights, empowering your team to make data-driven decisions.</p>
                </div>
                <div className="logos-marquee-container">
                  <div className="marquee-fade">
                    <div className="marquee">
                      {logos.filter(l => l.row_index === 1).map((l, i) => (
                        <div key={`${l.id}-${i}`} className="logo-box">
                          {l.logo_url ? <img src={l.logo_url} alt={l.alt_text || l.name} className="logo-img" /> : <div className="logo-placeholder" />}
                          <span className="logo-name">{l.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="marquee-fade">
                    <div className="marquee" style={{ animationDirection: 'reverse', animationDuration: '35s' }}>
                      {logos.filter(l => l.row_index === 2).map((l, i) => (
                        <div key={`${l.id}-${i}`} className="logo-box">
                          {l.logo_url ? <img src={l.logo_url} alt={l.alt_text || l.name} className="logo-img" /> : <div className="logo-placeholder" />}
                          <span className="logo-name">{l.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

      {/* Feature cards grid — Darkrise 2x3 style */}
            <section className="section" style={{ padding: '80px 0' }}>
              <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                  <h2 style={{ fontSize: 32, marginBottom: 12, textTransform: 'lowercase' }}>and, more features</h2>
                  <p style={{ color: 'var(--paws-ink-2)', maxWidth: 560, margin: '0 auto' }}>Gain invaluable predictive analytics and actionable insights, empowering your team to make data-driven decisions and close.</p>
                </div>
                <div className="feature-grid">
                  {features.map((f) => (
                    <div key={f.id} className="feature-card">
                      <div className="feature-icon" dangerouslySetInnerHTML={{ __html: f.icon_svg || '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>' }}></div>
                      <h3 style={{ fontSize: 20, marginBottom: 8 }}>{f.title}</h3>
                      <p style={{ color: 'var(--paws-ink-2)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{f.description}</p>
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
                  <div className="testimonial-marquee-grid">
                                      {testimonialDelays.split(',').map((delay, i) => (
                                        <div key={i} className="marquee-v-fade">
                                          <div className="marquee-vertical" style={{ animationDelay: delay.trim() }}>
                                            {testimonials.map((t) => (
                                              <div key={`${t.id}-${i}`} className="testimonial-card">
                                                <p>"{t.body}"</p>
                                                <cite>- {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</cite>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
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

                    {/* Glow CTA card (was split section) */}
                    <div className="wrap" style={{ marginTop: 60 }}>
                      <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
                        <div className="glow-blob pink" style={{ position: 'absolute', top: '-20%', left: '5%' }}></div>
                        <div className="glow-blob deep" style={{ position: 'absolute', bottom: '-20%', right: '5%' }}></div>
                        <div className="glass-card cta-card" style={{ position: 'relative', padding: '60px 40px', textAlign: 'center' }}>
                          <div className="border-pill" style={{ marginBottom: 24, width: 'fit-content', margin: '0 auto 24px' }}><span>Why PAWS</span></div>
                          <h2 style={{ fontSize: 32, marginBottom: 16 }}>Real people.<br />Real work that <span style={{ color: 'var(--paws-pink)' }}>delivers</span>.</h2>
                          <p style={{ color: 'var(--paws-ink-2)', marginBottom: 24, maxWidth: 560, margin: '0 auto 24px' }}>A coordinated team of multi-skilled professionals deployed on the work that actually moves your business forward.</p>
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
