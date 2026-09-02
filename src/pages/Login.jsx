import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Login() {
  const [search] = useSearchParams()
  const inviteCode = search.get('invite') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState(inviteCode ? 'signup' : 'password')
  const [msg, setMsg] = useState(inviteCode ? `You've been invited! Create your account to join PAWS.` : '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (inviteCode) {
      setMode('signup')
      // Pre-fill email from the invite record (so the invitee just sets a password)
      ;(async () => {
        if (!supabaseReady) return
        const db = requireSupabase()
        const { data: inv } = await db.from('invites').select('email, redeemed_at').eq('code', inviteCode).single()
        if (inv?.email) setEmail(inv.email)
        if (inv?.redeemed_at) { setMsg('This invite has already been used.'); setMode('password') }
      })()
    }
  }, [inviteCode])

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

  async function signUp(e) {
    e.preventDefault()
    if (!supabaseReady) { setMsg('Supabase not configured.'); return }
    if (!inviteCode) { setMsg('Missing invite code.'); return }
    setBusy(true); setMsg('Creating your account…')
    const db = requireSupabase()

    // 1) Verify the invite exists, is unclaimed, and (if email-bound) matches.
    const { data: inv, error: invErr } = await db.from('invites')
      .select('id, redeemed_at, email').eq('code', inviteCode).single()
    if (invErr || !inv) { setBusy(false); setMsg('Invalid or revoked invite code.'); return }
    if (inv.redeemed_at) { setBusy(false); setMsg('This invite has already been used.'); return }
    if (inv.email && inv.email.toLowerCase() !== email.toLowerCase()) {
      setBusy(false); setMsg(`This invite is for ${inv.email}, not ${email}.`); return
    }

    // 2) Create the auth user.
    const { data: signUpData, error: signUpErr } = await db.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin + '/portal' }
    })
    if (signUpErr || !signUpData?.user) {
      setBusy(false)
      setMsg(signUpErr?.message || 'Sign-up failed.')
      return
    }
    const newUserId = signUpData.user.id

    // 3) Create the members row.
    const slug = (name || email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const { error: memErr } = await db.from('members').insert({
      id: newUserId,
      slug,
      display_name: name || email.split('@')[0],
      member_visible: true,
      published: false,
      is_owner: false,
      display_order: 99,
    })
    if (memErr) {
      setBusy(false)
      setMsg(`Account created, but profile setup failed: ${memErr.message}. Email the owner.`)
      return
    }

    // 4) Mark the invite as redeemed.
    await db.from('invites').update({
      redeemed_at: new Date().toISOString(),
      member_id: newUserId,
    }).eq('id', inv.id)

    setBusy(false)
    // Go directly to portal — they're already signed in.
    window.location.href = '/portal'
  }

  return (
    <div className="wrap">
      <Nav />
      <section className="section" style={{ maxWidth: 440 }}>
        <h1>{mode === 'signup' ? 'Join PAWS' : 'Member sign in'}</h1>
        <p style={{ color: 'var(--paws-muted)' }}>
          {mode === 'signup' && inviteCode
            ? <>You've been invited. Create your account to join.</>
            : 'Invite-only. Use the email on your invite.'}
        </p>

        {mode !== 'signup' && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 24, fontSize: 14 }}>
            <button type="button" onClick={() => { setMode('password'); setMsg('') }} style={tabStyle(mode === 'password')}>Email + password</button>
            <button type="button" onClick={() => { setMode('magic'); setMsg('') }} style={tabStyle(mode === 'magic')}>Magic link</button>
          </div>
        )}

        {mode === 'password' && (
          <form onSubmit={signInPassword} style={{ display: 'grid', gap: 16 }}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input required type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
        )}
        {mode === 'magic' && (
          <form onSubmit={sendMagicLink} style={{ display: 'grid', gap: 16 }}>
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <button className="btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send magic link'}</button>
          </form>
        )}
        {mode === 'signup' && (
          <form onSubmit={signUp} style={{ display: 'grid', gap: 16 }}>
            <input required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input required type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <input required type="password" placeholder="Choose a password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
            <button className="btn btn-pink" type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account & join'}</button>
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
