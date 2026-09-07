import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'

export function Nav() {
  const [user, setUser] = useState(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(false)
  const [portalOpen, setPortalOpen] = useState(false)
  const navigate = useNavigate()
  const portalRef = useRef(null)

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
          const adminPerms = [
            'can_manage_members',
            'can_invite',
            'can_edit_testimonials',
            'can_edit_projects',
            'can_edit_site_content'
          ]
          const hasAnyAdminPerm = !!me.is_owner || adminPerms.some((perm) => perms[perm])
          setHasAdminAccess(hasAnyAdminPerm)
        }
      }
    })()
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user || null)
      if (!session) { setHasAdminAccess(false); setPortalOpen(false) }
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    function onClick(e) {
      if (portalRef.current && !portalRef.current.contains(e.target)) setPortalOpen(false)
    }
    if (portalOpen) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [portalOpen])

  async function signOut() {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.auth.signOut()
    setUser(null); setHasAdminAccess(false); setPortalOpen(false)
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

      {user ? (
        <div ref={portalRef} style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setPortalOpen((o) => !o)}
            className="nav-portal-toggle"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              font: 'inherit', color: 'inherit', padding: 0,
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
            aria-haspopup="true"
            aria-expanded={portalOpen}
          >
            Portal
            <span style={{ fontSize: 10, transform: portalOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▼</span>
          </button>
          {portalOpen && (
            <div
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                background: '#fff', border: '1px solid var(--paws-line)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)', minWidth: 180,
                zIndex: 100, padding: 4,
              }}
            >
              <Link
                to="/portal"
                onClick={() => setPortalOpen(false)}
                style={{ display: 'block', padding: '10px 14px', color: 'var(--paws-ink-2)' }}
              >
                My profile
              </Link>
              {hasAdminAccess && (
                <Link
                  to="/admin"
                  onClick={() => setPortalOpen(false)}
                  style={{ display: 'block', padding: '10px 14px', color: 'var(--paws-pink)', fontWeight: 600 }}
                >
                  Admin
                </Link>
              )}
              <button
                onClick={signOut}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'none', border: 'none',
                  cursor: 'pointer', font: 'inherit', color: 'var(--paws-muted)',
                  borderTop: '1px solid var(--paws-line)', marginTop: 4, paddingTop: 12,
                }}
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/portal">Sign in</Link>
      )}
    </nav>
  )
}
