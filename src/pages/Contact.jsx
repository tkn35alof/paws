import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Contact() {
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    ;(async () => {
      const { data } = await db.from('site_content').select('body').eq('key', 'contact').single()
      setBody(data?.body || '')
    })()
  }, [])

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Contact</h1>
        {body && body.trim() !== '' ? (
          <div style={{ maxWidth: 720, fontSize: 19, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 32 }}>
            {body}
          </div>
        ) : (
          <p style={{ maxWidth: 720, fontSize: 19, color: 'var(--paws-muted)' }}>
            Tell us what you need. We read every message and reply like professionals.
          </p>
        )}

        <h2 style={{ fontSize: 24, margin: '32px 0 16px' }}>Send a message</h2>
        <form style={{ maxWidth: 520, display: 'grid', gap: 16 }} onSubmit={(e) => e.preventDefault()}>
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
