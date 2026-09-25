import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Contact() {
  const [body, setBody] = useState(null)  // null = loading

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
        {body && body.trim() !== '' && (
          <div style={{ maxWidth: 720, fontSize: 19, lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 32 }}>
            {body}
          </div>
        )}

        <h2 style={{ fontSize: 24, margin: '32px 0 16px' }}>Send a message</h2>
        <p style={{ maxWidth: 560, color: 'var(--paws-muted)', marginBottom: 20, fontSize: 15, lineHeight: 1.6 }}>
          Fill in the form below and we will get back to you. For scheduling, use the booking calendar on the home page.
        </p>
        <div style={{ overflow: 'hidden', maxWidth: 760, margin: '0 auto' }}>
          <div style={{
            border: '1px solid var(--paws-line)',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            overflow: 'hidden',
            height: 735,
          }}>
            <iframe
              src="https://api.leadconnectorhq.com/widget/form/oPMPnASHBwPh7v4snFu4"
              style={{ width: '100%', height: 735, border: 'none', display: 'block' }}
              scrolling="auto"
              id="inline-oPMPnASHBwPh7v4snFu4"
              data-layout="{'id':'INLINE'}"
              data-trigger-type="alwaysShow"
              data-trigger-value=""
              data-activation-type="alwaysActivated"
              data-activation-value=""
              data-deactivation-type="neverDeactivate"
              data-deactivation-value=""
              data-form-name="PAWS"
              data-height="735"
              data-layout-iframe-id="inline-oPMPnASHBwPh7v4snFu4"
              data-form-id="oPMPnASHBwPh7v4snFu4"
              data-cookie-consent="true"
              data-cookie-consent-provider="auto"
              title="PAWS contact form"
              loading="lazy"
            />
          </div>
          <script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript" async></script>
        </div>
      </section>
      <Footer />
    </div>
  )
}