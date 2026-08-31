import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Contact() {
  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Contact</h1>
        <p style={{ maxWidth: 620, fontSize: 19 }}>
          Tell us what you need. We read every message and reply like professionals.
          Or book a discovery call above — whichever works for you.
        </p>
        <form style={{ maxWidth: 520, display: 'grid', gap: 16, marginTop: 24 }} onsubmit="return false;">
          <input required placeholder="Name" style={inputStyle} />
          <input required type="email" placeholder="Email" style={inputStyle} />
          <textarea required rows={5} placeholder="What do you need?" style={{ ...inputStyle, resize: 'vertical' }} />
          <button className="btn btn-pink" type="submit">Send message</button>
        </form>
        <p style={{ color: 'var(--paws-muted)', marginTop: 24, fontSize: 14 }}>
          Messages route to our GHL/email. (Phase 4: wire to GHL.)
        </p>
      </section>
      <Footer />
    </div>
  )
}
const inputStyle = {
  font: 'inherit', padding: '14px 16px', border: '1px solid var(--paws-line)',
  borderRadius: 2, background: '#fff',
}
