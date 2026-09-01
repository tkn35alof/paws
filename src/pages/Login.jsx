import { useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('password') // 'password' or 'magic'
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  async function signInPassword(e) {
    e.preventDefault()
    if (!supabaseReady) { setMsg('Supabase not configured.'); return }
    setBusy(true); setMsg('Signing in…')
    const db = requireSupabase()
    const { error } = await db.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) { setMsg(error.message); return }
    window.location.href = '/portal'
  }

  async function sendMagicLink(e) {
    e.preventDefault()
    if (!supabaseReady) { setMsg('Supabase not configured.'); return }
    setBusy(true); setMsg('Sending…')
    const db = requireSupabase()
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/portal' }
    })
    setBusy(false)
    if (error) setMsg(error.message)
    else setMsg('Check your email for the magic link.')
  }

  return (
    <div className="wrap">
      <Nav />
      <section className="section" style={{ maxWidth: 440 }}>
        <h1>Member sign in</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Invite-only. Use the email on your invite.</p>

        <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14 }}>
          <button
            type="button"
            onClick={() => { setMode('password'); setMsg('') }}
            style={tabStyle(mode === 'password')}
          >Email + password</button>
          <button
            type="button"
            onClick={() => { setMode('magic'); setMsg('') }}
            style={tabStyle(mode === 'magic')}
          >Magic link</button>
        </div>

        {mode === 'password' ? (
          <form onSubmit={signInPassword} style={{ display: 'grid', gap: 16 }}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : (
          <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: 16 }}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send magic link'}</button>
          </form>
        )}

        {msg && <p className="pink" style={{ marginTop: 16 }}>{msg}</p>}
      </section>
      <Footer />
    </div>
  )
}

function tabStyle(active) {
  return {
    background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0',
    borderBottom: active ? '2px solid var(--paws-pink)' : '2px solid transparent',
    color: active ? 'var(--paws-pink)' : 'var(--paws-muted)',
    fontFamily: 'var(--font-display)', fontWeight: 600,
  }
}

const inputStyle = { font: 'inherit', padding: '14px 16px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff' }
