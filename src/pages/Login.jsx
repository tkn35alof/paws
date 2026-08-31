import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email') // email -> code -> portal
  const [msg, setMsg] = useState('')

  async function sendLink(e) {
    e.preventDefault()
    setMsg('Sending…')
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + '/portal' } })
    if (error) setMsg(error.message)
    else { setMsg('Check your email for the magic link.'); setStep('link') }
  }

  return (
    <div className="wrap">
      <Nav />
      <section className="section" style={{ maxWidth: 440 }}>
        <h1>Member sign in</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Invite-only. Use the email on your invite.</p>
        {step === 'email' && (
          <form onSubmit={sendLink} style={{ display: 'grid', gap: 16 }}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <button className="btn" type="submit">Send magic link</button>
          </form>
        )}
        {step === 'link' && <p className="pink">{msg}</p>}
      </section>
      <Footer />
    </div>
  )
}
const inputStyle = { font: 'inherit', padding: '14px 16px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff' }
