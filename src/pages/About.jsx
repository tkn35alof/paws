import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

function ContentPage({ keyName, title }) {
  const [body, setBody] = useState('')
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('site_content').select('body').eq('key', keyName).single()
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
