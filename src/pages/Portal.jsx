import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { analyzePhoto, photoErrorMessage } from '../lib/face-photo.js'
import { Nav } from '../components/Nav.jsx'
import { Footer } from '../components/Footer.jsx'
import PortfolioView from '../portfolio/PortfolioView.jsx'
import PortfolioEditor from '../portfolio/PortfolioEditor.jsx'
import { PAGES, fetchRegions } from '../portfolio/portfolio.js'

/**
 * "My profile" — the member's portfolio, with an edit mode.
 *
 * Replaces the old profile form: the portfolio replica is the page, and the
 * region descriptor drives a form that writes back to portfolio_pages.
 * The profile details that feed the team cards (name, tagline, bio, photo)
 * stay on this page, beside the editor.
 */
export default function Portal() {
  const [member, setMember] = useState(null)
  const [notSignedIn, setNotSignedIn] = useState(false)
  const [page, setPage] = useState('home')
  const [content, setContent] = useState(null)
  const [regions, setRegions] = useState([])
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState('')

  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null)
  const [photoAnalysis, setPhotoAnalysis] = useState(null)
  const [photoError, setPhotoError] = useState('')
  const [syncAvatar, setSyncAvatar] = useState(true)
  const [avatarGenerating, setAvatarGenerating] = useState(false)
  const fileRef = useRef(null)
  const previewUrlRef = useRef(null)

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  // Who am I?
  useEffect(() => {
    if (!supabaseReady) { setStatus('Supabase not configured.'); return }
    const db = requireSupabase()
    ;(async () => {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { setNotSignedIn(true); return }
      const { data } = await db.from('members').select('*').eq('id', user.id).single()
      setMember(data)
      if (data?.photo_raw) {
        const { data: signed } = await db.storage.from('member-photos').createSignedUrl(data.photo_raw, 600)
        setPhotoUrl(signed?.signedUrl || null)
      }
      setSyncAvatar(data?.sync_avatar_on_update ?? true)
    })()
  }, [])

  // Load the page's regions (static) and content (Supabase).
  useEffect(() => {
    if (!member) return
    let cancelled = false
    setContent(null)
    ;(async () => {
      const [regs, rows] = await Promise.all([
        fetchRegions(page),
        supabaseReady
          ? requireSupabase().from('portfolio_pages').select('content').eq('member_id', member.id).eq('page_key', page).single()
          : Promise.resolve({ data: null }),
      ])
      if (cancelled) return
      setRegions(regs)
      setContent(rows?.data?.content || {})
      setDirty(false)
    })()
    return () => { cancelled = true }
  }, [member, page])

  async function save() {
    if (!member) return
    setSaving(true)
    setStatus('')
    const db = requireSupabase()
    const { error } = await db.from('portfolio_pages').upsert(
      { member_id: member.id, page_key: page, content },
      { onConflict: 'member_id,page_key' },
    )
    if (error) {
      setStatus('Save failed: ' + error.message)
      setSaving(false)
      return
    }
    await db.from('members').update({
      display_name: member.display_name,
      tagline: member.tagline,
      bio: member.bio,
    }).eq('id', member.id)
    setSaving(false)
    setDirty(false)
    setStatus('Saved.')
  }

  function clearPhotoPreview() {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    setPhotoPreviewUrl(null)
    setPhotoAnalysis(null)
    setPhotoError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function onFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
    setPhotoPreviewUrl(null); setPhotoAnalysis(null); setPhotoError(''); setUploading(true)
    setStatus('Checking the photo for a clear face…')

    let blob = null
    try {
      const result = await analyzePhoto(file)
      blob = result.blob
      const previewUrl = URL.createObjectURL(blob)
      previewUrlRef.current = previewUrl
      setPhotoPreviewUrl(previewUrl)
      setPhotoAnalysis({ crop: result.crop, faceCount: result.faceCount, score: result.score })
    } catch (error) {
      const message = photoErrorMessage(error)
      setPhotoError(message); setStatus(message); setUploading(false); e.target.value = ''
      return
    }
    if (!member) { setStatus('Profile not loaded yet.'); setUploading(false); e.target.value = ''; return }

    const db = requireSupabase()
    const path = `${member.id}/std-${Date.now()}.jpg`
    const { error: upErr } = await db.storage.from('member-photos').upload(path, blob, {
      cacheControl: '3600', upsert: true, contentType: 'image/jpeg',
    })
    if (upErr) { setPhotoError(upErr.message); setStatus('Upload failed: ' + upErr.message); setUploading(false); e.target.value = ''; return }
    const { data: signed } = await db.storage.from('member-photos').createSignedUrl(path, 600)
    const { error: dbErr } = await db.from('members').update({ photo_raw: path }).eq('id', member.id)
    if (dbErr) { setPhotoError(dbErr.message); setStatus('Save failed: ' + dbErr.message); setUploading(false); e.target.value = ''; return }

    setPhotoUrl(signed?.signedUrl || null)
    setMember((m) => ({ ...m, photo_raw: path }))
    if (syncAvatar) {
      setAvatarGenerating(true)
      try {
        await db.functions.invoke('generate-avatar', {
          body: JSON.stringify({ memberId: member.id, photoRaw: path, syncAvatarOnUpdate: true }),
        })
      } catch (e) { /* avatar failure is non-fatal */ }
      setAvatarGenerating(false)
    }
    setStatus('Photo saved.')
    setUploading(false)
    e.target.value = ''
  }

  if (notSignedIn) {
    return (
      <div className="wrap" style={{ padding: 120 }}>
        <Nav />
        <p>You need to sign in to edit your portfolio.</p>
        <Link className="btn" to="/login">Sign in</Link>
      </div>
    )
  }
  if (!member) {
    return <div className="wrap" style={{ padding: 120 }}><Nav /><p>{status || 'Loading…'}</p></div>
  }

  return (
    <div className="wrap">
      <Nav />
      <section className="section" style={{ paddingBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>My profile</h1>
            <p style={{ color: 'var(--paws-muted)', margin: 0, maxWidth: 640 }}>
              This is <strong>{member.display_name}</strong>'s portfolio. Pick a page, edit its content, save.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className={editing ? 'btn' : 'btn btn-pink'} onClick={() => setEditing((e) => !e)}>
              {editing ? 'Preview' : 'Edit content'}
            </button>
            <button type="button" className="btn btn-pink" disabled={saving || !dirty} onClick={save}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '22px 0', flexWrap: 'wrap' }}>
          {PAGES.map((p) => (
            <button
              key={p.key}
              type="button"
              className={p.key === page ? 'btn btn-pink' : 'btn btn-ghost'}
              onClick={() => setPage(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <PortfolioView
              slug={member.slug}
              page={page}
              content={content}
              regions={regions}
              height="calc(100vh - 300px)"
            />
          </div>

          {editing && (
            <div style={{
              width: 400, flexShrink: 0, maxHeight: 'calc(100vh - 300px)',
              overflow: 'auto', paddingRight: 10,
              borderLeft: '1px solid var(--paws-line)', paddingLeft: 24,
            }}>
              <section style={{ marginBottom: 28 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--paws-pink)' }}>
                  Profile details
                </h3>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ width: 84, height: 105, background: 'var(--paws-paper-2)', border: '1px solid var(--paws-line)', overflow: 'hidden', flexShrink: 0 }}>
                    {photoPreviewUrl
                      ? <img src={photoPreviewUrl} alt="Crop preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : photoUrl
                        ? <img src={photoUrl} alt="Your photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'var(--paws-muted)', fontSize: 11 }}>No photo</span>}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} style={{ display: 'none' }} />
                    <button type="button" className="btn btn-ghost" disabled={uploading} onClick={() => fileRef.current?.click()}>
                      {uploading ? 'Checking…' : 'Change photo'}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--paws-ink-2)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={syncAvatar} onChange={(e) => setSyncAvatar(e.target.checked)} style={{ accentColor: 'var(--paws-pink)' }} />
                      Regenerate avatar
                    </label>
                    {avatarGenerating && <span style={{ fontSize: 12, color: 'var(--paws-pink)' }}>Generating…</span>}
                    {photoAnalysis && (
                      <span style={{ fontSize: 12, color: 'var(--paws-muted)' }}>
                        {photoAnalysis.faceCount} face{photoAnalysis.faceCount === 1 ? '' : 's'} · {(photoAnalysis.score * 100).toFixed(0)}%
                      </span>
                    )}
                    {photoError && <span style={{ fontSize: 12, color: 'var(--paws-pink-deep)' }}>{photoError}</span>}
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <ProfileInput label="Display name" value={member.display_name || ''} disabled={saving}
                    onChange={(v) => { setMember({ ...member, display_name: v }); setDirty(true) }} />
                  <ProfileInput label="Tagline" value={member.tagline || ''} disabled={saving}
                    onChange={(v) => { setMember({ ...member, tagline: v }); setDirty(true) }} />
                  <ProfileTextArea label="Bio" value={member.bio || ''} disabled={saving}
                    onChange={(v) => { setMember({ ...member, bio: v }); setDirty(true) }} />
                </div>
              </section>

              <PortfolioEditor
                page={page}
                content={content}
                regions={regions}
                onChange={(v) => { setContent(v); setDirty(true) }}
                disabled={saving}
              />
            </div>
          )}
        </div>

        {status && <p style={{ marginTop: 18, color: 'var(--paws-pink)' }}>{status}</p>}
        {dirty && !status && <p style={{ marginTop: 18, color: 'var(--paws-muted)', fontSize: 13 }}>Unsaved changes</p>}
      </section>
      <Footer />
    </div>
  )
}

function ProfileInput({ label, value, onChange, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--paws-muted)', marginBottom: 5 }}>{label}</label>
      <input style={inputStyle} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function ProfileTextArea({ label, value, onChange, disabled }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--paws-muted)', marginBottom: 5 }}>{label}</label>
      <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

const inputStyle = {
  font: 'inherit', fontSize: 14, padding: '9px 12px',
  border: '1px solid var(--paws-line)', borderRadius: 'var(--radius-md)',
  background: 'rgba(14,14,24,0.6)', color: 'var(--paws-ink)',
  width: '100%', boxSizing: 'border-box',
}
