import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'

export function Nav() {
  const [user, setUser] = useState(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    if (!supabaseReady) return
    const db = requireSupabase()
    let mounted = true
    ;(async () => {
      const { data: { user: authUser } } = await db.auth.getUser()
      if (!mounted) return
      setUser(authUser)
      if (authUser) {
        const { data: me } = await db.from('members').select('is_owner, permissions').eq('id', authUser.id).single()
        if (me && mounted) {
          const perms = me.permissions || {}
          const adminPerms = ['can_manage_members', 'can_invite', 'can_edit_testimonials', 'can_edit_projects', 'can_edit_site_content', 'can_edit_logos', 'can_edit_features']
          const hasAnyAdminPerm = !!me.is_owner || adminPerms.some((perm) => perms[perm])
          setHasAdminAccess(hasAnyAdminPerm)
        }
      }
    })()
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session) { setHasAdminAccess(false); setMenuOpen(false) }
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    if (menuOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  // Close menu on navigation
  function navigateAndClose(to) {
    setMenuOpen(false)
    navigate(to)
  }

  async function signOut() {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.auth.signOut()
    setUser(null); setHasAdminAccess(false); setMenuOpen(false)
    navigate('/')
  }

  const links = [
    { to: '/', label: 'Team' },
    { to: '/projects', label: 'Work' },
    { to: '/about', label: 'About' },
    { to: '/mission', label: 'Mission' },
    { to: '/vision', label: 'Vision' },
    { to: '/contact', label: 'Contact' },
  ]

  return (
    <nav className="nav">
      <Link className="brand" to="/">PAWS<span className="brand-dot">.</span></Link>

      <div className="nav-right" ref={menuRef}>
        {user ? (
          <button
            type="button"
            className="nav-burger"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <span className="burger-line"></span>
            <span className="burger-line"></span>
            <span className="burger-line"></span>
          </button>
        ) : (
          <Link to="/portal" className="nav-signin">Sign in</Link>
        )}
        {menuOpen && (
          <div className="nav-dropdown">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMenuOpen(false)}
                className="nav-dd-item"
              >
                <span className="nav-dd-icon">◈</span>
                {l.label}
              </Link>
            ))}
            <Link
              to="/portal"
              onClick={() => setMenuOpen(false)}
              className="nav-dd-item"
            >
              <span className="nav-dd-icon">◈</span>
              My profile
            </Link>
            {hasAdminAccess && (
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="nav-dd-item admin"
              >
                <span className="nav-dd-icon">⚙</span>
                Admin
              </Link>
            )}
            <button
              onClick={signOut}
              className="nav-dd-item signout"
            >
              <span className="nav-dd-icon">↛</span>
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}