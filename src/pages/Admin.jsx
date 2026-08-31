import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Admin() {
  const [ok, setOk] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    const db = requireSupabase()
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: me } = await db.from('members').select('is_owner').eq('id', user.id).single()
      if (!me?.is_owner) { setLoading(false); return }
      setOk(true)
      const { data } = await db.from('members').select('*').order('display_order')
      setMembers(data || [])
      setLoading(false)
    })()
  }, [])

  async function togglePublish(id, val) {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.from('members').update({ published: val }).eq('id', id)
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, published: val } : m)))
  }

  if (loading) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Checking access…</p></div>
  if (!ok) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Owner access required.</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Admin — PAWS</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Owner control. Invite members, publish profiles, manage permissions.</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 24 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
              <th style={th}>Name</th><th style={th}>Published</th><th style={th}>Availability (owner-only)</th><th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                <td style={td}>{m.display_name}</td>
                <td style={td}>{m.published ? 'Yes' : 'No'}</td>
                <td style={td}>{m.availability}</td>
                <td style={td}>
                  {m.published
                    ? <button className="btn" onClick={() => togglePublish(m.id, false)}>Unpublish</button>
                    : <button className="btn btn-pink" onClick={() => togglePublish(m.id, true)}>Publish</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: 'var(--paws-muted)', marginTop: 24, fontSize: 14 }}>
          Full invite / permission / testimonial / project management: Phase 3.
        </p>
      </section>
      <Footer />
    </div>
  )
}
const th = { padding: '12px 8px', fontFamily: 'var(--font-display)' }
const td = { padding: '12px 8px' }
