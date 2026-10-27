import { Link } from 'react-router-dom'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

/*
 * PAWS — post-booking discovery case study page.
 * Wire this as your GHL calendar "Redirect URL":
 *   https://paws-temp.vercel.app/discovery
 * Drop your intro video below (Loom/YouTube embed). Leave empty -> falls back
 * to the written case study. No external tracking, no faux domains.
 */
const VIDEO_URL = '' // e.g. https://www.loom.com/embed/... — set and redeploy
const MEETING_LINK = 'https://api.leadconnectorhq.com/widget/booking/YrYXL1dDWGNvci77AyUb'

export default function Discovery() {
  return (
    <>
      <div className="wrap">
        <Nav />

        <section className="section">
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div className="kicker">Thank you for booking</div>
            <h1 style={{ fontSize: 36, marginTop: 12, marginBottom: 8 }}>
              Real systems. <span style={{ color: 'var(--paws-pink)' }}>Not funnels.</span>
            </h1>
            <p style={{ color: 'var(--paws-ink-2)', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
              Alof — Operations & Project Lead at PAWS. This page is the live case
              study behind the workflow you just booked time to audit.
            </p>
          </div>
        </section>

        {/* Intro video / written case study */}
        <section className="section">
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            {VIDEO_URL ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 24 }}>
                <iframe
                  src={VIDEO_URL}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0, borderRadius: 'var(--radius-card)' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title="PAWS operations case study"
                />
              </div>
            ) : (
              <div
                className="glass-card"
                style={{ padding: 28, borderRadius: 'var(--radius-card)', marginBottom: 24 }}
              >
                <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>What I ship for clients</h2>
                <p style={{ color: 'var(--paws-ink-2)', lineHeight: 1.7, margin: 0 }}>
              I architect clean, event-driven GoHighLevel stacks — a single source of
              truth per client that syncs inbound ↔ CRM ↔ fulfillment without the
              “funnel zoo” of disconnected automations. For PAWS clients that means
              Shopify → GHL order sync, lead ingestion → nurture → task handoff,
              and a retainer-ready ops dashboard. The 3-bullet audit below is what
              we’ll walk through on the call.
            </p>
          </div>
        )}

            <h2 style={{ fontSize: 22, marginTop: 0, marginBottom: 14 }}>What to expect on the call</h2>
            <ul style={{ display: 'grid', gap: 12, paddingLeft: 0, color: 'var(--paws-ink-2)', fontSize: 16, lineHeight: 1.6 }}>
              <li><strong>1. Current system audit — </strong>you walk me through your stack end to end; I flag the 2–3 highest-cost leaks live.</li>
              <li> <strong>2. Bottleneck identification — </strong>we pin the one workflow costing you the most time and confirm it’s automatable.</li>
              <li style={{ marginTop: 0 }}><strong>3. Proposed automations + retainer scope — </strong>I show the exact GHL build you’d get and the retainer that owns it.</li>
            </ul>
          </div>
        </section>

        {/* Quick credibility stats (mirrors Home) */}
        <section className="section">
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <div className="stat-item glass-card" style={{ textAlign: 'center', padding: 18 }}>
                <div className="stat-number" style={{ fontSize: 28, color: 'var(--paws-pink)' }}>7</div>
                <div className="stat-label" style={{ color: 'var(--paws-ink-2)', fontSize: 13 }}>Specialists in the PAWS collective</div>
              </div>
              <div className="stat-item glass-card" style={{ textAlign: 'center', padding: 18 }}>
                <div className="stat-number" style={{ fontSize: 28, color: 'var(--paws-pink)' }}>15K+</div>
                <div className="stat-label" style={{ color: 'var(--paws-ink-2)', fontSize: 13 }}>Records processed through owned automations</div>
              </div>
              <div className="stat-item glass-card" style={{ textAlign: 'center', padding: 18 }}>
                <div className="stat-number" style={{ fontSize: 28, color: 'var(--paws-pink)' }}>24/7</div>
                <div className="stat-label" style={{ color: 'var(--paws-ink-2)', fontSize: 13 }}>Coverage (Ph-based handoff)</div>
              </div>
            </div>
          </div>
        </section>

        {/* Portfolio + reschedule */}
        <section className="section" style={{ padding: '48px 0' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <Link to="/projects" className="btn" style={{ marginRight: 12 }}>See the work</Link>
            <a
              href="https://v2.onlinejobs.ph/jobseekers/info/2596105"
              className="btn btn-ghost"
              target="_blank"
              rel="noopener noreferrer"
              style={{ marginRight: 12 }}
            >My OLJ profile</a>
            <a
              href={MEETING_LINK}
              className="btn btn-pink"
              target="_blank"
              rel="noopener noreferrer"
            >Need to reschedule?</a>
          </div>
        </section>
      </div>
      <Footer />
    </>
  )
}
