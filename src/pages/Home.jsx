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

      {/* Integration logos marquee — Darkrise two-row staggered style */}
            <section className="section" style={{ padding: '80px 0' }}>
              <div className="wrap">
                <div style={{ textAlign: 'center', marginBottom: 48 }}>
                  <h2 style={{ fontSize: 32, marginBottom: 12 }}>Connect with 100+ tools</h2>
                  <p style={{ color: 'var(--paws-ink-2)', maxWidth: 560, margin: '0 auto' }}>Gain invaluable predictive analytics and actionable insights, empowering your team to make data-driven decisions.</p>
                </div>
                <div style={{ overflow: 'hidden', position: 'relative' }}>
                  <div className="marquee-fade" style={{ marginBottom: 24 }}>
                    <div className="marquee">
                      {['hubspot','intercom','kickstarter','hubspot','intercom','kickstarter','hubspot','intercom','kickstarter','hubspot','intercom','kickstarter'].map((name, i) => (
                        <div key={`${name}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, width: 120 }}>
                          <img src={`/logos/${name}.svg`} alt={name} width="56" height="56" style={{ display: 'block' }} />
                          <span style={{ fontSize: 12, color: 'var(--paws-ink-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="marquee-fade">
                    <div className="marquee" style={{ animationDirection: 'reverse', animationDuration: '35s' }}>
                      {['zapier','mailchimp','shopify','slack','zapier','mailchimp','shopify','slack','zapier','mailchimp','shopify','slack'].map((name, i) => (
                        <div key={`${name}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0, width: 120 }}>
                          <img src={`/logos/${name}.svg`} alt={name} width="56" height="56" style={{ display: 'block' }} />
                          <span style={{ fontSize: 12, color: 'var(--paws-ink-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
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
            {[
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', title: 'Setup Everything Fast', desc: 'Get your workspace configured and ready in minutes, not days.' },
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="2"/><rect x="3" y="8" width="18" height="2"/><rect x="3" y="12" width="18" height="2"/><rect x="3" y="16" width="18" height="2"/><circle cx="8" cy="19" r="1" fill="currentColor"/></svg>', title: 'Schedule Campaign', desc: 'Automated campaigns that reach the right people at the right time.' },
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-6"/></svg>', title: 'Live Reports', desc: 'Real-time dashboards showing exactly what is working and what needs attention.' },
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8z"/></svg>', title: 'Chat Module in Website', desc: 'Embedded chat so clients reach you instantly without leaving the page.' },
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2h12v20H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>', title: 'Unlimited Products', desc: 'No caps on what you can list, sell, or manage through our platform.' },
              { svg: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><circle cx="17" cy="7" r="3"/><path d="M21 21v-2a4 4 0 00-4-4h-1"/></svg>', title: 'Collect Information', desc: 'Smart forms that capture leads and route them to the right team member.' },
            ].map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" dangerouslySetInnerHTML={{ __html: f.svg }}></div>
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
                  <div className="testimonial-marquee-grid">
                    <div className="marquee-v-fade">
                      <div className="marquee-vertical" style={{ animationDelay: '0s' }}>
                        {testimonials.map((t) => (
                          <div key={t.id} className="testimonial-card">
                            <p>"{t.body}"</p>
                            <cite>- {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</cite>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="marquee-v-fade">
                      <div className="marquee-vertical" style={{ animationDelay: '-20s' }}>
                        {testimonials.map((t) => (
                          <div key={`${t.id}-b`} className="testimonial-card">
                            <p>"{t.body}"</p>
                            <cite>- {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</cite>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="marquee-v-fade">
                      <div className="marquee-vertical" style={{ animationDelay: '-40s' }}>
                        {testimonials.map((t) => (
                          <div key={`${t.id}-c`} className="testimonial-card">
                            <p>"{t.body}"</p>
                            <cite>- {t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</cite>
                          </div>
                        ))}
                      </div>
                    </div>
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
