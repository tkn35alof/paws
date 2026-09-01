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
  const [tab, setTab] = useState('members')   // 'members' | 'invites' | 'testimonials'
  const [invites, setInvites] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [newInvite, setNewInvite] = useState({ code: '', email: '' })

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    const db = requireSupabase()
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: me } = await db.from('members').select('is_owner').eq('id', user.id).single()
      if (!me?.is_owner) { setLoading(false); return }
      setOk(true)
      await Promise.all([loadMembers(db), loadInvites(db), loadTestimonials(db)])
      setLoading(false)
    })()
  }, [])

  async function loadMembers(db) {
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
  }
  async function loadInvites(db) {
    const { data } = await db.from('invites').select('*').order('created_at', { ascending: false })
    setInvites(data || [])
  }
  async function loadTestimonials(db) {
    const { data } = await db.from('testimonials').select('*').order('display_order')
    setTestimonials(data || [])
  }

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

  async function generateInvite() {
    if (!supabaseReady) return
    const db = requireSupabase()
    // Generate a readable 8-char code
    const code = (newInvite.code || Math.random().toString(36).slice(2, 10).toUpperCase()).trim()
    if (!code) { alert('Enter a code or leave blank to auto-generate'); return }
    const { data: { user } } = await db.auth.getUser()
    const { error } = await db.from('invites').insert({
      code,
      created_by: user.id,
    })
    if (error) { alert(error.message); return }
    setNewInvite({ code: '', email: '' })
    await loadInvites(db)
    // Copy the invite link to clipboard
    const link = `${window.location.origin}/login?invite=${code}`
    try { await navigator.clipboard.writeText(link); alert(`Invite created. Link copied to clipboard:\n${link}`) }
    catch { alert(`Invite created. Share this link:\n${link}`) }
  }

  async function revokeInvite(id) {
    if (!supabaseReady) return
    const db = requireSupabase()
    if (!confirm('Revoke this invite? Member who already redeemed keeps their access.')) return
    await db.from('invites').delete().eq('id', id)
    await loadInvites(db)
  }

  async function toggleTestimonialPublish(id, val) {
    if (!supabaseReady) return
    const db = requireSupabase()
    await db.from('testimonials').update({ published: val }).eq('id', id)
    setTestimonials((ts) => ts.map((t) => (t.id === id ? { ...t, published: val } : t)))
  }

  async function addTestimonial() {
    if (!supabaseReady) return
    const db = requireSupabase()
    const author = prompt('Author name?'); if (!author) return
    const title = prompt('Author title? (optional)') || null
    const body = prompt('Testimonial text?'); if (!body) return
    const order = testimonials.length
    const { error } = await db.from('testimonials').insert({
      author_name: author, author_title: title, body, display_order: order,
    })
    if (error) { alert(error.message); return }
    await loadTestimonials(db)
  }

  async function deleteTestimonial(id) {
    if (!supabaseReady) return
    if (!confirm('Delete this testimonial?')) return
    const db = requireSupabase()
    await db.from('testimonials').delete().eq('id', id)
    await loadTestimonials(db)
  }

  if (loading) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Checking access…</p></div>
  if (!ok) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Owner access required.</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Admin — PAWS</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Owner control panel.</p>

        <div style={{ display: 'flex', gap: 16, margin: '24px 0', borderBottom: '1px solid var(--paws-line)' }}>
          {['members', 'invites', 'testimonials'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
                borderBottom: tab === t ? '2px solid var(--paws-pink)' : '2px solid transparent',
                color: tab === t ? 'var(--paws-pink)' : 'var(--paws-muted)',
                fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'capitalize',
              }}
            >{t}</button>
          ))}
        </div>

        {tab === 'members' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 12px' }}>
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
          </>
        )}

        {tab === 'invites' && (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 0 24px' }}>
              <input
                style={{ ...inputStyle, maxWidth: 240 }}
                placeholder="Code (blank = auto)"
                value={newInvite.code}
                onChange={(e) => setNewInvite({ ...newInvite, code: e.target.value })}
              />
              <button className="btn btn-pink" style={smallBtn} onClick={generateInvite}>Generate invite</button>
              <span style={{ color: 'var(--paws-muted)', fontSize: 13 }}>
                A link like <code>/login?invite=CODE</code> will be copied to your clipboard.
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
                  <th style={th}>Code</th>
                  <th style={th}>Created</th>
                  <th style={th}>Redeemed</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr><td style={td} colSpan={4}><em style={{ color: 'var(--paws-muted)' }}>No invites yet.</em></td></tr>
                ) : invites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                    <td style={td}><code>{inv.code}</code></td>
                    <td style={td}>{new Date(inv.created_at).toLocaleString()}</td>
                    <td style={td}>{inv.redeemed_at ? new Date(inv.redeemed_at).toLocaleString() : <em style={{ color: 'var(--paws-muted)' }}>not yet</em>}</td>
                    <td style={td}>
                      <button className="btn" style={smallBtn} onClick={() => {
                        const link = `${window.location.origin}/login?invite=${inv.code}`
                        navigator.clipboard?.writeText(link)
                        alert(`Copied: ${link}`)
                      }}>Copy link</button>
                      {!inv.redeemed_at && (
                        <button className="btn" style={{ ...smallBtn, marginLeft: 6 }} onClick={() => revokeInvite(inv.id)}>Revoke</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {tab === 'testimonials' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 12px' }}>
              <button className="btn btn-pink" style={smallBtn} onClick={addTestimonial}>+ Add testimonial</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
                  <th style={th}>Author</th>
                  <th style={th}>Body</th>
                  <th style={th}>Published</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {testimonials.length === 0 ? (
                  <tr><td style={td} colSpan={4}><em style={{ color: 'var(--paws-muted)' }}>No testimonials yet.</em></td></tr>
                ) : testimonials.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                    <td style={td}>{t.author_name}{t.author_title ? `, ${t.author_title}` : ''}</td>
                    <td style={{ ...td, maxWidth: 400 }}>{t.body.slice(0, 120)}{t.body.length > 120 ? '…' : ''}</td>
                    <td style={td}>{t.published ? 'Yes' : 'No'}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {t.published
                          ? <button className="btn" style={smallBtn} onClick={() => toggleTestimonialPublish(t.id, false)}>Unpublish</button>
                          : <button className="btn btn-pink" style={smallBtn} onClick={() => toggleTestimonialPublish(t.id, true)}>Publish</button>}
                        <button className="btn" style={smallBtn} onClick={() => deleteTestimonial(t.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <p style={{ color: 'var(--paws-muted)', marginTop: 24, fontSize: 14 }}>
          P3a: members + invites + testimonials. P3b: projects + permissions + site content — coming next.
        </p>
      </section>
      <Footer />
    </div>
  )
}
const th = { padding: '12px 8px', fontFamily: 'var(--font-display)' }
const td = { padding: '12px 8px' }
const smallBtn = { fontSize: 12, padding: '8px 14px' }
const inputStyle = { font: 'inherit', padding: '10px 14px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff' }
