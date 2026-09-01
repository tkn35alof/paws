import { useEffect, useRef, useState } from 'react'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

function TagInput({ label, values, onChange, placeholder }) {
  const [draft, setDraft] = useState('')
  function commit(value) {
    const v = value.trim()
    if (!v) return
    if (values.includes(v)) return
    onChange([...values, v])
  }
  function onKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commit(draft)
      setDraft('')
    } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
      e.preventDefault()
      onChange(values.slice(0, -1))
    }
  }
  function onPaste(e) {
    const pasted = e.clipboardData.getData('text')
    if (pasted.includes(',') || pasted.includes('\n')) {
      e.preventDefault()
      const parts = pasted.split(/[,\n]+/).map((s) => s.trim()).filter(Boolean)
      const merged = [...values]
      for (const p of parts) if (!merged.includes(p)) merged.push(p)
      onChange(merged)
      setDraft('')
    }
  }
  function remove(idx) { onChange(values.filter((_, i) => i !== idx)) }

  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--paws-muted)', marginBottom: 6 }}>{label}</label>
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 6,
        padding: 10, border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff',
        minHeight: 44, alignItems: 'center',
      }}>
        {values.map((v, i) => (
          <span key={`${v}-${i}`} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'var(--paws-pink-wash)', color: 'var(--paws-pink-deep)',
            border: '1px solid var(--paws-pink)', borderRadius: 999,
            padding: '3px 10px', fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600,
          }}>
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label={`Remove ${v}`}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--paws-pink-deep)', fontSize: 14, lineHeight: 1, padding: 0 }}
            >×</button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => { commit(draft); setDraft('') }}
          placeholder={values.length === 0 ? placeholder : ''}
          style={{ flex: 1, minWidth: 120, border: 'none', outline: 'none', font: 'inherit', padding: 4 }}
        />
      </div>
      <p style={{ color: 'var(--paws-muted)', fontSize: 12, margin: '6px 0 0' }}>
        Type and press <kbd>Enter</kbd> or <kbd>,</kbd> to add. <kbd>Backspace</kbd> removes the last tag. Paste with commas works too.
      </p>
    </div>
  )
}

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
    const { error: dbErr } = await db.from('members').update({ photo_raw: path }).eq('id', member.id)
    if (dbErr) { setStatus(dbErr.message); setUploading(false); return }
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

        <form onSubmit={save} style={{ display: 'grid', gap: 20, maxWidth: 640 }}>
          <Field label="Display name">
            <input style={inputStyle} value={form.display_name || ''} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Display name" />
          </Field>
          <Field label="Tagline">
            <input style={inputStyle} value={form.tagline || ''} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Tagline" />
          </Field>
          <Field label="Bio">
            <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={5} value={form.bio || ''} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
          </Field>
          <TagInput
            label="Role tags"
            values={form.role_tags || []}
            onChange={(v) => setForm({ ...form, role_tags: v })}
            placeholder="e.g. GHL, Front-end, EA"
          />
          <TagInput
            label="Skills"
            values={form.skills || []}
            onChange={(v) => setForm({ ...form, skills: v })}
            placeholder="e.g. React, Inbox triage, Wiring"
          />
          <Field label="Availability (owner only)">
            <select style={inputStyle} value={form.availability || 'available'} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
              <option value="available">Available</option>
              <option value="busy">Busy</option>
              <option value="away">Away</option>
            </select>
          </Field>
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

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, color: 'var(--paws-muted)', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = { font: 'inherit', padding: '12px 14px', border: '1px solid var(--paws-line)', borderRadius: 2, background: '#fff', width: '100%', boxSizing: 'border-box' }
