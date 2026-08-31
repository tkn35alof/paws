import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'

export default function Portal() {
  const [member, setMember] = useState(null)
  const [form, setForm] = useState({})
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStatus('Not signed in. Use /login.'); return }
      const { data } = await supabase.from('members').select('*').eq('id', user.id).single()
      setMember(data)
      setForm(data || {})
    })()
  }, [])

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    // Members CANNOT change published / is_owner / member_visible.
    const patch = {
      display_name: form.display_name,
      tagline: form.tagline,
      bio: form.bio,
      role_tags: form.role_tags || [],
      skills: form.skills || [],
      links: form.links || {},
      availability: form.availability,
      photo_raw: form.photo_raw,
    }
    const { error } = await supabase.from('members').update(patch).eq('id', member.id)
    setStatus(error ? error.message : 'Saved.')
    setSaving(false)
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
