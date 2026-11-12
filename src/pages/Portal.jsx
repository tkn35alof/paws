import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabaseReady, requireSupabase } from '../lib/supabase.js'
import { analyzePhoto, photoErrorMessage } from '../lib/face-photo.js'
import PortfolioView from '../portfolio/PortfolioView.jsx'
import { fetchRegions } from '../portfolio/portfolio.js'

/**
 * "My profile" — the member's portfolio, full screen.
 *
 * There is no header and no page tab strip: the portfolio's own rail navigates
 * between pages. The only chrome is a small floating cluster over the portfolio
 * (details / edit / save). Clicking any text, image or link edits it in place;
 * each change is written back to portfolio_pages.
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
  const [showDetails, setShowDetails] = useState(false)

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
    // Dev-only: `?devmock=1` fakes the signed-in member so the portal can be
    // worked on without a session. import.meta.env.DEV is stripped from
    // production builds.
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('devmock')) {
      setMember({ id: 'b2b4cd5a-0a3a-4108-8812-f6dd78a88548', slug: 'jhuriel', display_name: 'Jhuriel Guerra', tagline: 'Founder & Lead', bio: '' })
      return
    }
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

  // The portfolio's own rail navigates by posting a message; in the portal that
  // switches the internal page instead of leaving /portal.
  useEffect(() => {
    function onMessage(e) {
      if (e.data && e.data.type === 'paws:portfolio-nav' && e.data.href) {
        const m = e.data.href.match(/^\/portfolio\/[^/]+\/(\w+)$/)
        if (m) {
          setEditing(false)
          setPage(m[1])
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // An inline edit from the iframe. `twins` are the marquee's duplicate keys —
  // the track is doubled for its loop, so every copy must be written.
  const onContentChange = useCallback((key, value, twins) => {
    setContent((c) => {
      const next = { ...(c || {}), [key]: value }
      ;(twins || []).forEach((k) => { next[k] = value })
      return next
    })
    setDirty(true)
    setStatus('')
  }, [])

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
      } catch (err) { /* avatar failure is non-fatal */ }
      setAvatarGenerating(false)
    }
    setStatus('Photo saved.')
    setUploading(false)
    e.target.value = ''
  }

  if (notSignedIn) {
    return (
      <div className="wrap" style={{ padding: 120 }}>
        <p>You need to sign in to edit your portfolio.</p>
        <Link className="btn" to="/login">Sign in</Link>
      </div>
    )
  }
  if (!member) {
    return <div style={{ padding: 120, color: 'var(--paws-muted)' }}>{status || 'Loading…'}</div>
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0b0b14', overflow: 'hidden' }}>
      <PortfolioView
        slug={member.slug}
        page={page}
        content={content}
        regions={regions}
        editable={editing}
        onContentChange={onContentChange}
        height="100vh"
      />

      {/* Floating chrome over the portfolio */}
      <div style={{
        position: 'fixed', top: 18, right: 18, zIndex: 100,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <FloatingBtn onClick={() => setShowDetails((s) => !s)} label="Details" />
        <FloatingBtn onClick={() => setEditing((e) => !e)} label={editing ? 'Done' : 'Edit'} primary />
        <FloatingBtn onClick={save} label={saving ? 'Saving…' : 'Save'} disabled={saving || !dirty} />
        <Link to="/" style={fbStyle(false)}>← PAWS</Link>
      </div>

      {status && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '8px 16px', borderRadius: 999,
          background: 'rgba(14,14,24,.9)', border: '1px solid var(--paws-line)',
          color: dirty ? 'var(--paws-muted)' : 'var(--paws-pink)', fontSize: 13,
        }}>
          {status}
        </div>
      )}
      {dirty && !status && (
        <div style={{
          position: 'fixed', bottom: 22, left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, padding: '6px 14px', borderRadius: 999,
          background: 'rgba(14,14,24,.75)', border: '1px solid var(--paws-line)',
          color: 'var(--paws-muted)', fontSize: 12,
        }}>
          Unsaved changes
        </div>
      )}

      {/* Profile details, floating over the portfolio */}
      {showDetails && (
        <div style={{
          position: 'fixed', top: 70, right: 18, zIndex: 100, width: 340,
          maxHeight: 'calc(100vh - 100px)', overflow: 'auto',
          padding: 18, borderRadius: 'var(--radius-lg)',
          background: 'rgba(14,14,24,.94)', border: '1px solid var(--paws-line)',
          backdropFilter: 'blur(10px)',
        }}>
          <h3 style={{
            margin: '0 0 14px', fontSize: 12, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--paws-pink)',
          }}>
            Profile details
          </h3>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{
              width: 72, height: 90, background: 'var(--paws-paper-2)',
              border: '1px solid var(--paws-line)', overflow: 'hidden', flexShrink: 0,
            }}>
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
            <Field label="Display name" value={member.display_name || ''} disabled={saving}
              onChange={(v) => { setMember({ ...member, display_name: v }); setDirty(true) }} />
            <Field label="Tagline" value={member.tagline || ''} disabled={saving}
              onChange={(v) => { setMember({ ...member, tagline: v }); setDirty(true) }} />
            <Field label="Bio" value={member.bio || ''} disabled={saving} textarea
              onChange={(v) => { setMember({ ...member, bio: v }); setDirty(true) }} />
          </div>
        </div>
      )}
    </div>
  )
}

function FloatingBtn({ onClick, label, primary, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...fbStyle(!!primary),
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {label}
    </button>
  )
}

function fbStyle(primary) {
  return {
    padding: '8px 16px',
    borderRadius: 999,
    fontSize: 13,
    font: 'inherit',
    background: primary ? 'var(--paws-pink)' : 'rgba(14,14,24,.85)',
    color: primary ? '#fff' : 'var(--paws-ink)',
    border: primary ? 'none' : '1px solid var(--paws-line)',
    backdropFilter: 'blur(8px)',
    cursor: 'pointer',
  }
}

function Field({ label, value, onChange, disabled, textarea }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: 'var(--paws-muted)', marginBottom: 5 }}>{label}</label>
      {textarea
        ? <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
        : <input style={inputStyle} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} />}
    </div>
  )
}

const inputStyle = {
  font: 'inherit', fontSize: 14, padding: '9px 12px',
  border: '1px solid var(--paws-line)', borderRadius: 'var(--radius-md)',
  background: 'rgba(22,22,31,0.9)', color: 'var(--paws-ink)',
  width: '100%', boxSizing: 'border-box',
}
