import { useEffect, useRef, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Portal() {
  const [member, setMember] = useState(null)
  const [form, setForm] = useState({})
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!supabaseReady) { setStatus('Supabase not configured.'); return }
    const db = requireSupabase()
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { setStatus('Not signed in. Use /login.'); return }
      const { data } = await db.from('members').select('*').eq('id', user.id).single()
      setMember(data)
      setForm(data || {})
      // Load the current photo (if any) as a short-lived signed URL.
      if (data?.photo_raw) {
        const { data: signed } = await db.storage.from('member-photos')
          .createSignedUrl(data.photo_raw, 600)
        setPhotoUrl(signed?.signedUrl || null)
      }
    })()
  }, [])

  async function save(e) {
    e.preventDefault()
    if (!supabaseReady) { setStatus('Supabase not configured.'); return }
    setSaving(true)
    const db = requireSupabase()
    const patch = {
      display_name: form.display_name,
      tagline: form.tagline,
      bio: form.bio,
      role_tags: form.role_tags || [],
      skills: form.skills || [],
      links: form.links || {},
      availability: form.availability,
    }
    const { error } = await db.from('members').update(patch).eq('id', member.id)
    setStatus(error ? error.message : 'Saved.')
    setSaving(false)
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!supabaseReady) { setStatus('Supabase not configured.'); return }
    setUploading(true)
    setStatus('Uploading photo…')
    const db = requireSupabase()
    const path = `${member.id}/raw-${Date.now()}.${file.name.split('.').pop()}`
    const { error: upErr } = await db.storage.from('member-photos').upload(path, file, {
      cacheControl: '3600', upsert: true, contentType: file.type,
    })
    if (upErr) { setStatus(upErr.message); setUploading(false); return }
    // Save the storage path to the member row. Note: members cannot set
    // photo_std themselves — owner will standardize in P3 admin.
    const { error: dbErr } = await db.from('members').update({ photo_raw: path }).eq('id', member.id)
    if (dbErr) { setStatus(dbErr.message); setUploading(false); return }
    // Refresh signed URL for preview.
    const { data: signed } = await db.storage.from('member-photos').createSignedUrl(path, 600)
    setPhotoUrl(signed?.signedUrl || null)
    setMember({ ...member, photo_raw: path })
    setStatus('Photo uploaded. Owner will standardize for client view.')
    setUploading(false)
  }

  if (!member) return <div className="wrap" style={{ padding: 120 }}><Nav /><p>{status || 'Loading…'}</p></div>

  return (
    <div className="wrap">
      <Nav />
      <section className="section">
        <h1>My profile</h1>
        <p style={{ color: 'var(--paws-muted)' }}>
          Editing as <strong>{member.display_name}</strong>. Availability is visible to the owner only.
          You cannot publish yourself — the owner controls what's public.
        </p>

        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', margin: '24px 0' }}>
          <div style={{ width: 160, height: 200, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {photoUrl
              ? <img src={photoUrl} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'var(--paws-muted)', fontSize: 13 }}>No photo yet</span>}
          </div>
          <div style={{ display: 'grid', gap: 12, alignContent: 'center' }}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
            <button type="button" className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
              {uploading ? 'Uploading…' : (member.photo_raw ? 'Replace photo' : 'Upload photo')}
            </button>
            <p style={{ color: 'var(--paws-muted)', fontSize: 13, maxWidth: 280 }}>
              Upload a professional portrait. The owner standardizes the framing for the public team grid.
            </p>
          </div>
        </div>

        <form onSubmit={save} style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
          <input style={inputStyle} value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Display name" />
          <input style={inputStyle} value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" />
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={5} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
          <input style={inputStyle} value={(form.role_tags || []).join(', ')} onChange={(e) => setForm({ ...form, role_tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Role tags (comma separated)" />
          <input style={inputStyle} value={(form.skills || []).join(', ')} onChange={(e) => setForm({ ...form, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} placeholder="Skills (comma separated)" />
          <select style={inputStyle} value={form.availability || 'available'} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="away">Away</option>
          </select>
          <p style={{ color: 'var(--paws-muted)', fontSize: 14 }}>
            Publish state: <strong>{member.published ? 'Published' : 'Not published'}</strong> (owner-controlled)
          </p>
          <button className="btn btn-pink" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <span className="pink">{status}</span>
        </form>
      </section>
      <Footer />
    </div>
  )
}

const inputStyle = { font: 'inherit', padding: '14px 16px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff' }
