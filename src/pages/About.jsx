import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

function PageBody({ body, fallback }) {
  if (!body || body.trim() === '') {
    return <p style={{ maxWidth: 720, fontSize: 19, color: 'var(--paws-muted)' }}>{fallback}</p>
  }
  return (
    <div style={{ maxWidth: 720, fontSize: 19, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
      {body}
    </div>
  )
}

function ContentPage({ keyName, title, fallback }) {
  const [body, setBody] = useState('')
  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    ;(async () => {
      const { data } = await db.from('site_content').select('body').eq('key', keyName).single()
      setBody(data?.body || '')
    })()
  }, [keyName])
  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>{title}</h1>
        <PageBody body={body} fallback={fallback} />
      </section>
      <Footer />
    </div>
  )
}

export function About() {
  return (
    <ContentPage
      keyName="about"
      title="About us"
      fallback="Tell clients who PAWS is, what you do, and who you serve. (Owner: edit this in /admin → Content tab.)"
    />
  )
}
export function Mission() {
  return (
    <ContentPage
      keyName="mission"
      title="Mission"
      fallback="Why PAWS exists and the problem you solve. (Owner: edit this in /admin → Content tab.)"
    />
  )
}
export function Vision() {
  return (
    <ContentPage
      keyName="vision"
      title="Vision"
      fallback="Where PAWS is heading in 1-3 years. (Owner: edit this in /admin → Content tab.)"
    />
  )
}
