import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Admin() {
  const [ok, setOk] = useState(false)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState({})
  const [busy, setBusy] = useState(null)

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
      const urls = {}
      for (const m of (data || [])) {
        urls[m.id] = {}
        if (m.photo_raw) {
          const { data: s } = await db.storage.from('member-photos').createSignedUrl(m.photo_raw, 3600)
          urls[m.id].raw = s?.signedUrl
        }
      }
      setPhotoUrls(urls)
      setLoading(false)
    })()
  }, [])

  async function togglePublish(id, val) {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.from('members').update({ published: val }).eq('id', id)
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, published: val } : m)))
  }

  async function refreshOne(id) {
    if (!supabaseReady) return
    const db = requireSupabase()
    const { data } = await db.from('members').select('*').eq('id', id).single()
    if (data) {
      setMembers((ms) => ms.map((m) => (m.id === id ? data : m)))
      const u = { ...(photoUrls[id] || {}) }
      if (data.photo_raw) {
        const { data: s } = await db.storage.from('member-photos').createSignedUrl(data.photo_raw, 3600)
        u.raw = s?.signedUrl
      } else { u.raw = undefined }
      setPhotoUrls((p) => ({ ...p, [id]: u }))
    }
  }

  async function standardize(id) {
    if (!supabaseReady) return
    const db = requireSupabase()
    setBusy(id)
    const m = members.find((x) => x.id === id)
    if (!m?.photo_raw) { setBusy(null); return }
    // Direct browser flow (Option A): download raw, upload to public bucket, update row.
    const { data: blob, error: dlErr } = await db.storage.from('member-photos').download(m.photo_raw)
    if (dlErr) { alert(`Download failed: ${dlErr.message}`); setBusy(null); return }
    const stdPath = `${id}/std-${Date.now()}.jpg`
    const { error: upErr } = await db.storage.from('member-photos-public').upload(stdPath, blob, {
      cacheControl: '3600', upsert: true, contentType: 'image/jpeg',
    })
    if (upErr) { alert(`Upload failed: ${upErr.message}`); setBusy(null); return }
    const { data: pub } = db.storage.from('member-photos-public').getPublicUrl(stdPath)
    const stdUrl = pub.publicUrl
    const { error: dbErr } = await db.from('members').update({ photo_std: stdUrl }).eq('id', id)
    if (dbErr) { alert(`Update failed: ${dbErr.message}`); setBusy(null); return }
    setMembers((ms) => ms.map((x) => (x.id === id ? { ...x, photo_std: stdUrl } : x)))
    setBusy(null)
  }

  if (loading) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Checking access…</p></div>
  if (!ok) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Owner access required.</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Admin — PAWS</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Owner control. Publish profiles, standardize photos, manage permissions.</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 12px' }}>
          <h2 style={{ margin: 0 }}>Members</h2>
          <button className="btn" style={smallBtn} onClick={() => window.location.reload()}>Refresh all</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
              <th style={th}>Photo</th>
              <th style={th}>Name</th>
              <th style={th}>Published</th>
              <th style={th}>Avail</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {photoUrls[m.id]?.raw
                      ? <img src={photoUrls[m.id].raw} alt="raw" style={{ width: 40, height: 50, objectFit: 'cover', border: '1px solid var(--paws-line)' }} />
                      : <div style={{ width: 40, height: 50, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)' }} />}
                    {m.photo_std
                      ? <img src={m.photo_std} alt="std" style={{ width: 40, height: 50, objectFit: 'cover', border: '1px solid var(--paws-pink)' }} title="Standardized" />
                      : <div style={{ width: 40, height: 50, background: 'var(--paws-paper-2)', border: '1px dashed var(--paws-line)' }} />}
                  </div>
                </td>
                <td style={td}>{m.display_name}</td>
                <td style={td}>{m.published ? 'Yes' : 'No'}</td>
                <td style={td}>{m.availability}</td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {m.published
                      ? <button className="btn" style={smallBtn} onClick={() => togglePublish(m.id, false)}>Unpublish</button>
                      : <button className="btn btn-pink" style={smallBtn} onClick={() => togglePublish(m.id, true)}>Publish</button>}
                    {m.photo_raw && !m.photo_std && (
                      <button className="btn" style={smallBtn} disabled={busy === m.id} onClick={() => standardize(m.id)}>
                        {busy === m.id ? 'Working…' : 'Standardize photo'}
                      </button>
                    )}
                    <button className="btn" style={smallBtn} onClick={() => refreshOne(m.id)} title="Re-fetch this member's data">↻</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: 'var(--paws-muted)', marginTop: 24, fontSize: 14 }}>
          Full invite / permission / testimonial / project management: P3.
        </p>
      </section>
      <Footer />
    </div>
  )
}
const th = { padding: '12px 8px', fontFamily: 'var(--font-display)' }
const td = { padding: '12px 8px' }
const smallBtn = { fontSize: 12, padding: '8px 14px' }
