import { useEffect, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

const TAB_META = [
  { key: 'members',     label: 'Members',     perms: ['can_manage_members'],           ownerOnly: false },
  { key: 'invites',     label: 'Invites',     perms: ['can_invite'],                   ownerOnly: false },
  { key: 'testimonials',label: 'Testimonials',perms: ['can_edit_testimonials'],         ownerOnly: false },
  { key: 'projects',    label: 'Projects',    perms: ['can_edit_projects'],            ownerOnly: false },
  { key: 'content',     label: 'Content',     perms: ['can_edit_site_content'],        ownerOnly: false },
]

function tabAllowed(meta, isOwner, perms) {
  if (isOwner) return true
  if (meta.ownerOnly) return false
  return meta.perms.some((p) => perms?.[p])
}

export default function Admin() {
  const [isOwner, setIsOwner] = useState(false)
  const [memberPerms, setMemberPerms] = useState({})
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoUrls, setPhotoUrls] = useState({})
  const [busy, setBusy] = useState(null)
  const [tab, setTab] = useState(null)
  const [invites, setInvites] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [projects, setProjects] = useState([])
  const [siteContent, setSiteContent] = useState({ about: '', mission: '', vision: '', contact: '' })
  const [editingProject, setEditingProject] = useState(null)
  const [editingMemberPerms, setEditingMemberPerms] = useState(null)
  const [newInvite, setNewInvite] = useState({ code: '', email: '' })

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return }
    const db = requireSupabase()
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: me } = await db.from('members').select('is_owner, permissions').eq('id', user.id).single()
      if (!me) { setLoading(false); return }
      setIsOwner(!!me.is_owner)
      setMemberPerms(me.permissions || {})

      const allowed = TAB_META.filter((m) => tabAllowed(m, !!me.is_owner, me.permissions || {}))
      if (allowed.length === 0) { setLoading(false); return }
      setTab(allowed[0].key)

      const tasks = []
      if (me.is_owner) {
        tasks.push(loadMembers(db), loadInvites(db), loadTestimonials(db), loadProjects(db), loadSiteContent(db))
      } else {
        if (allowed.find((m) => m.key === 'testimonials')) tasks.push(loadTestimonials(db))
        if (allowed.find((m) => m.key === 'projects'))    tasks.push(loadProjects(db))
        if (allowed.find((m) => m.key === 'content'))     tasks.push(loadSiteContent(db))
        if (allowed.find((m) => m.key === 'invites'))     tasks.push(loadInvites(db))
        if (allowed.find((m) => m.key === 'members'))     tasks.push(loadMembers(db))
      }
      await Promise.all(tasks)
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
  async function loadSiteContent(db) {
    const { data } = await db.from('site_content').select('*')
    const map = { about: '', mission: '', vision: '', contact: '' }
    for (const row of (data || [])) {
      if (row.key in map) map[row.key] = row.body || ''
    }
    setSiteContent(map)
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

  async function savePermissions(id, permissions) {
    if (!supabaseReady) return
    const db = requireSupabase()
    const { error } = await db.from('members').update({ permissions }).eq('id', id)
    if (error) { alert(error.message); return }
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, permissions } : m)))
    setEditingMemberPerms(null)
  }

  async function generateInvite() {
    if (!supabaseReady) return
    const db = requireSupabase()
    const email = (newInvite.email || '').trim().toLowerCase()
    if (!email) { alert("Enter the invitee's email address."); return }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert("That email doesn't look right."); return }
    setBusy('invite')
    const { data: { session } } = await db.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
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
    const { error } = await db.from('testimonials').insert({ author_name: author, author_title: title, body, display_order: order })
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

  async function saveProject(p) {
    if (!supabaseReady) return
    const db = requireSupabase()
    const payload = {
      title: p.title, summary: p.summary, cover_image: p.cover_image,
      member_ids: p.member_ids || [], published: !!p.published,
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

  async function saveSiteContent(key, body) {
    if (!supabaseReady) return
    const db = requireSupabase()
    const { error } = await db.from('site_content').upsert({ key, body, updated_at: new Date().toISOString() }, { onConflict: 'key' })
    if (error) { alert(error.message); return }
    setSiteContent((sc) => ({ ...sc, [key]: body }))
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
  if (!tab) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>No admin access. Sign in or ask the owner to grant you permissions.</p></div>

  const visibleTabs = TAB_META.filter((m) => tabAllowed(m, isOwner, memberPerms))

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <div className="kicker">Admin</div>
        <h1>{isOwner ? 'Owner control panel' : 'Your access'}</h1>

        {tab === 'members' && (
          <>
            {isOwner && editingMemberPerms && (
              <div style={{ marginBottom: 32 }}>
                <PermissionsEditor
                  member={members.find((m) => m.id === editingMemberPerms)}
                  onSave={savePermissions}
                  onCancel={() => setEditingMemberPerms(null)}
                />
              </div>
            )}
            {!isOwner && (
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)' }}>
                <p style={{ margin: 0, color: 'var(--paws-muted)' }}>
                  You can view the member list below but cannot edit permissions.
                  <strong>Only the owner can manage member permissions.</strong>
                </p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 16px' }}>
              {isOwner && <button className="btn btn-ghost" style={smallBtn} onClick={() => window.location.reload()}>Refresh</button>}
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
                          ? <button className="btn btn-ghost" style={smallBtn} onClick={() => togglePublish(m.id, false)}>Unpublish</button>
                          : <button className="btn btn-pink" style={smallBtn} onClick={() => togglePublish(m.id, true)}>Publish</button>}
                        {isOwner && m.photo_raw && !m.photo_std && (
                          <button className="btn btn-ghost" style={smallBtn} disabled={busy === m.id} onClick={() => standardize(m.id)}>
                            {busy === m.id ? 'Working…' : 'Standardize photo'}
                          </button>
                        )}
                        <button className="btn btn-ghost" style={smallBtn} onClick={() => refreshOne(m.id)} title="Re-fetch">↻</button>
                        {isOwner && (
                          <button className="btn btn-ghost" style={smallBtn} onClick={() => setEditingMemberPerms(m.id)} title="Edit permissions">⚙</button>
                        )}
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
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '0 0 32px', flexWrap: 'wrap' }}>
              <input
                style={{ ...inputStyle, maxWidth: 320 }}
                type="email"
                placeholder="Invitee email address"
                value={newInvite.email}
                onChange={(e) => setNewInvite({ ...newInvite, email: e.target.value })}
              />
              <button className="btn btn-pink" style={smallBtn} onClick={generateInvite} disabled={busy === 'invite'}>
                {busy === 'invite' ? 'Sending…' : 'Generate & send invite'}
              </button>
              <span style={{ color: 'var(--paws-muted)', fontSize: 13 }}>
                A single-use link tied to this email will be sent automatically.
              </span>
            </div>
            {!isOwner && (
              <div style={{ marginBottom: 24, padding: 16, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)' }}>
                <p style={{ margin: 0, color: 'var(--paws-muted)' }}>
                  You can view the invite list below but cannot edit it.
                  <strong>Only the owner or users with "can_invite" permission can edit invites.</strong>
                </p>
              </div>
            )}
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
                  <tr><td style={td} colSpan={5}><em style={{ color: 'var(--paws-muted)' }}>No invites yet.</em></td></tr