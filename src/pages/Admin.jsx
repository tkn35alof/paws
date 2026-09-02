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
  const [tab, setTab] = useState('members')
  const [invites, setInvites] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [projects, setProjects] = useState([])
  const [editingProject, setEditingProject] = useState(null)   // null = list, 'new' = new form, id = edit form
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
      await Promise.all([loadMembers(db), loadInvites(db), loadTestimonials(db), loadProjects(db)])
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
  async function loadProjects(db) {
    const { data } = await db.from('projects').select('*').order('display_order')
    setProjects(data || [])
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
    const email = (newInvite.email || '').trim().toLowerCase()
    if (!email) { alert('Enter the invitee\'s email address.'); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('That email doesn\'t look right.'); return }

    setBusy('invite')
    const { data: { session } } = await db.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ email }),
    })
    setBusy(null)

    let payload = null
    try { payload = await res.json() } catch {}

    if (!res.ok || !payload?.ok) {
      alert(payload?.error || `Failed to send invite (HTTP ${res.status}).`)
      return
    }

    setNewInvite({ code: '', email: '' })
    await loadInvites(db)
    if (payload.warning) {
      alert(`Invite row created for ${email}, but email sending failed: ${payload.warning}\n\nManual link: ${payload.link}`)
    } else {
      alert(`Invite sent to ${email}. They should receive an email with a signup link.`)
    }
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

  // -------- Projects CRUD --------
  async function saveProject(p) {
    if (!supabaseReady) return
    const db = requireSupabase()
    const payload = {
      title: p.title,
      summary: p.summary,
      cover_image: p.cover_image,
      member_ids: p.member_ids || [],
      published: !!p.published,
      display_order: p.display_order ?? projects.length,
    }
    if (p.id) {
      const { error } = await db.from('projects').update(payload).eq('id', p.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await db.from('projects').insert(payload)
      if (error) { alert(error.message); return }
    }
    setEditingProject(null)
    await loadProjects(db)
  }

  async function deleteProject(id) {
    if (!supabaseReady) return
    if (!confirm('Delete this project?')) return
    const db = requireSupabase()
    await db.from('projects').delete().eq('id', id)
    await loadProjects(db)
  }

  async function uploadProjectCover(p, file) {
    if (!file) return
    const db = requireSupabase()
    const path = `project-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await db.storage.from('member-photos-public').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type,
    })
    if (upErr) { alert(`Upload failed: ${upErr.message}`); return }
    const { data: pub } = db.storage.from('member-photos-public').getPublicUrl(path)
    return pub.publicUrl
  }

  if (loading) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Checking access…</p></div>
  if (!ok) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>Owner access required.</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>Admin — PAWS</h1>
        <p style={{ color: 'var(--paws-muted)' }}>Owner control panel.</p>

        <div style={{ display: 'flex', gap: 16, margin: '24px 0', borderBottom: '1px solid var(--paws-line)', flexWrap: 'wrap' }}>
          {['members', 'invites', 'testimonials', 'projects'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setEditingProject(null) }}
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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 0 24px', flexWrap: 'wrap' }}>
              <input
                style={{ ...inputStyle, maxWidth: 320 }}
                type="email"
                placeholder="Invitee email address"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
              />
              <button
                className="btn btn-pink"
                style={smallBtn}
                onClick={generateInvite}
                disabled={busy === 'invite'}
              >
                {busy === 'invite' ? 'Sending…' : 'Generate & send invite'}
              </button>
              <span style={{ color: 'var(--paws-muted)', fontSize: 13 }}>
                A single-use link tied to this email will be sent automatically.
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
                  <th style={th}>Email</th>
                  <th style={th}>Code</th>
                  <th style={th}>Created</th>
                  <th style={th}>Redeemed</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.length === 0 ? (
                  <tr><td style={td} colSpan={5}><em style={{ color: 'var(--paws-muted)' }}>No invites yet.</em></td></tr>
                ) : invites.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                    <td style={td}>{inv.email || <em style={{ color: 'var(--paws-muted)' }}>(any)</em>}</td>
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

        {tab === 'projects' && (
          editingProject ? (
            <ProjectEditor
              project={editingProject === 'new' ? null : projects.find((p) => p.id === editingProject)}
              members={members}
              onSave={saveProject}
              onCancel={() => setEditingProject(null)}
              onUploadCover={uploadProjectCover}
            />
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 12px' }}>
                <button className="btn btn-pink" style={smallBtn} onClick={() => setEditingProject('new')}>+ New project</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--paws-line)' }}>
                    <th style={th}>Cover</th>
                    <th style={th}>Title</th>
                    <th style={th}>Summary</th>
                    <th style={th}>Published</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.length === 0 ? (
                    <tr><td style={td} colSpan={5}><em style={{ color: 'var(--paws-muted)' }}>No projects yet.</em></td></tr>
                  ) : projects.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--paws-line)' }}>
                      <td style={td}>
                        {p.cover_image
                          ? <img src={p.cover_image} alt={p.title} style={{ width: 60, height: 40, objectFit: 'cover', border: '1px solid var(--paws-line)' }} />
                          : <div style={{ width: 60, height: 40, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)' }} />}
                      </td>
                      <td style={td}>{p.title}</td>
                      <td style={{ ...td, maxWidth: 300 }}>{p.summary?.slice(0, 80)}{p.summary?.length > 80 ? '…' : ''}</td>
                      <td style={td}>{p.published ? 'Yes' : 'No'}</td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn" style={smallBtn} onClick={() => setEditingProject(p.id)}>Edit</button>
                          {p.published
                            ? <button className="btn" style={smallBtn} onClick={async () => { const db = requireSupabase(); await db.from('projects').update({ published: false }).eq('id', p.id); await loadProjects(db) }}>Unpublish</button>
                            : <button className="btn btn-pink" style={smallBtn} onClick={async () => { const db = requireSupabase(); await db.from('projects').update({ published: true }).eq('id', p.id); await loadProjects(db) }}>Publish</button>}
                          <button className="btn" style={smallBtn} onClick={() => deleteProject(p.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        )}

        <p style={{ color: 'var(--paws-muted)', marginTop: 24, fontSize: 14 }}>
          P3b: projects CRUD shipped. Next: site content editor for About/Mission/Vision/Contact.
        </p>
      </section>
      <Footer />
    </div>
  )
}

function ProjectEditor({ project, members, onSave, onCancel, onUploadCover }) {
  const [title, setTitle] = useState(project?.title || '')
  const [summary, setSummary] = useState(project?.summary || '')
  const [coverImage, setCoverImage] = useState(project?.cover_image || '')
  const [memberIds, setMemberIds] = useState(project?.member_ids || [])
  const [published, setPublished] = useState(project?.published || false)
  const [uploading, setUploading] = useState(false)

  async function onCoverFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploading(true)
    const url = await onUploadCover(project, f)
    setUploading(false)
    if (url) setCoverImage(url)
  }

  function toggleMember(id) {
    setMemberIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
  }

  return (
    <div style={{ background: 'var(--paws-paper-2)', padding: 24, border: '1px solid var(--paws-line)' }}>
      <h2 style={{ marginTop: 0 }}>{project ? 'Edit project' : 'New project'}</h2>
      <div style={{ display: 'grid', gap: 16, maxWidth: 720 }}>
        <Field label="Title">
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project name" />
        </Field>
        <Field label="Summary">
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="One or two sentences" />
        </Field>
        <Field label="Cover image">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {coverImage ? <img src={coverImage} alt="cover" style={{ width: 120, height: 80, objectFit: 'cover', border: '1px solid var(--paws-line)' }} /> : <div style={{ width: 120, height: 80, background: '#fff', border: '1px dashed var(--paws-line)' }} />}
            <label className="btn" style={{ ...smallBtn, cursor: 'pointer' }}>
              {uploading ? 'Uploading…' : (coverImage ? 'Replace' : 'Upload')}
              <input type="file" accept="image/*" onChange={onCoverFile} style={{ display: 'none' }} />
            </label>
            {coverImage && <button type="button" className="btn" style={smallBtn} onClick={() => setCoverImage('')}>Remove</button>}
          </div>
        </Field>
        <Field label="Team members on this project">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleMember(m.id)}
                style={{
                  padding: '4px 10px', borderRadius: 999,
                  border: '1px solid ' + (memberIds.includes(m.id) ? 'var(--paws-pink)' : 'var(--paws-line)'),
                  background: memberIds.includes(m.id) ? 'var(--paws-pink-wash)' : '#fff',
                  color: memberIds.includes(m.id) ? 'var(--paws-pink-deep)' : 'var(--paws-muted)',
                  cursor: 'pointer', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600,
                }}
              >
                {m.display_name}
              </button>
            ))}
          </div>
        </Field>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          <span>Publish on public site</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-pink" onClick={() => onSave({ id: project?.id, title, summary, cover_image: coverImage, member_ids: memberIds, published })}>Save</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--paws-muted)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const th = { padding: '12px 8px', fontFamily: 'var(--font-display)' }
const td = { padding: '12px 8px' }
const smallBtn = { fontSize: 12, padding: '8px 14px' }
const inputStyle = { font: 'inherit', padding: '10px 14px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff' }
