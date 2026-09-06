import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'

export function Nav() {
  const [user, setUser] = useState(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    let mounted = true
    ;(async () => {
      const { data: { user: authUser } } = await db.auth.getUser()
      if (!mounted) return
      setUser(authUser)
      if (authUser) {
        // Check if user has any admin-tab permission
        const { data: me } = await db.from('members').select('permissions').eq('id', authUser.id).single()
        if (me && me.permissions) {
          const perms = me.permissions
          const adminPerms = [
            'can_manage_members',
            'can_invite',
            'can_edit_testimonials',
            'can_edit_projects',
            'can_edit_site_content'
          ]
          const hasAnyAdminPerm = adminPerms.some(perm => perms[perm])
          if (mounted) setHasAdminAccess(hasAnyAdminPerm)
        }
      }
    })()
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session) setHasAdminAccess(false)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  async function signOut() {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.auth.signOut()
    setUser(null); setHasAdminAccess(false)
    navigate('/')
  }

  return (
    <nav className="nav">
      <Link className="brand" to="/">PAWS<span className="brand-dot">.</span></Link>
      <Link to="/">Team</Link>
      <Link to="/projects">Work</Link>
      <Link to="/about">About</Link>
      <Link to="/mission">Mission</Link>
      <Link to="/vision">Vision</Link>
      <Link to="/contact">Contact</Link>
      <Link to="/portal">{user ? 'Portal' : 'Sign in'}</Link>
      {hasAdminAccess && <Link to="/admin" style={{ color: 'var(--paws-pink)' }}>Admin</Link>}
      {user && (
        <button onClick={signOut} className="signout">
          Sign out
        </button>
      )}
    </nav>
  )
}