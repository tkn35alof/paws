import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'

export function Nav() {
  const [user, setUser] = useState(null)
  const [isOwner, setIsOwner] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    let mounted = true
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!mounted) return
      setUser(user)
      if (user) {
        const { data: me } = await db.from('members').select('is_owner').eq('id', user.id).single()
        if (me?.is_owner && mounted) setIsOwner(true)
      }
    })()
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session) setIsOwner(false)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  async function signOut() {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.auth.signOut()
    setUser(null); setIsOwner(false)
    navigate('/')
  }

  return (
    <nav className="nav">
      <Link className="brand" to="/">PAWS</Link>
      <Link to="/">Team</Link>
      <Link to="/projects">Work</Link>
      <Link to="/about">About</Link>
      <Link to="/mission">Mission</Link>
      <Link to="/vision">Vision</Link>
      <Link to="/contact">Contact</Link>
      <Link to="/portal">{user ? 'Portal' : 'Sign in'}</Link>
      {isOwner && <Link to="/admin" style={{ color: 'var(--paws-pink)' }}>Admin</Link>}
      {user && (
        <button
          onClick={signOut}
          style={{
            background: 'none', border: '1px solid var(--paws-line)', borderRadius: 2,
            padding: '4px 12px', cursor: 'pointer', color: 'var(--paws-muted)',
            fontFamily: 'var(--font-display)', fontSize: 13,
          }}
        >
          Sign out
        </button>
      )}
    </nav>
  )
}
