import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

function ContentPage({ keyName, title }) {
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
        <p style={{ maxWidth: 720, fontSize: 19 }}>{body || 'Content coming soon.'}</p>
      </section>
      <Footer />
    </div>
  )
}

export function About() { return <ContentPage keyName="about" title="About us" /> }
export function Mission() { return <ContentPage keyName="mission" title="Mission" /> }
export function Vision() { return <ContentPage keyName="vision" title="Vision" /> }
