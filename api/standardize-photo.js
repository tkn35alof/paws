// PAWS — /api/standardize-photo
// Vercel Serverless Function (Node). Copies a member's raw photo from the
// private bucket to the public bucket and updates photo_std on the row.
// Uses service-role key server-side, so it bypasses client-side RLS entirely.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Extract bearer token
  const auth = req.headers.authorization || ''
  const jwt = auth.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return res.status(401).json({ error: 'Missing Authorization bearer token' })

  // Body
  const { memberId } = req.body || {}
  if (!memberId) return res.status(400).json({ error: 'Missing memberId' })

  // Env
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase env' })
  }

  // Service-role client (bypasses RLS)
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // User-scoped client to verify the caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })

  // Verify caller is the owner
  const { data: userData, error: userErr } = await userClient.auth.getUser(jwt)
  if (userErr || !userData?.user) {
    return res.status(401).json({ error: 'Invalid session' })
  }
  const { data: me, error: meErr } = await admin
    .from('members')
    .select('is_owner')
    .eq('id', userData.user.id)
    .single()
  if (meErr || !me?.is_owner) {
    return res.status(403).json({ error: 'Owner access required' })
  }

  // Fetch the member's photo_raw
  const { data: member, error: mErr } = await admin
    .from('members')
    .select('photo_raw')
    .eq('id', memberId)
    .single()
  if (mErr || !member?.photo_raw) {
    return res.status(404).json({ error: 'No raw photo for this member' })
  }

  // Download raw photo
  const { data: blob, error: dlErr } = await admin.storage
    .from('member-photos')
    .download(member.photo_raw)
  if (dlErr || !blob) {
    return res.status(500).json({ error: 'Download failed: ' + (dlErr?.message || 'unknown') })
  }

  // Upload to public bucket
  const stdPath = `${memberId}/std-${Date.now()}.jpg`
  const { error: upErr } = await admin.storage
    .from('member-photos-public')
    .upload(stdPath, blob, {
      cacheControl: '3600', upsert: true, contentType: 'image/jpeg',
    })
  if (upErr) {
    return res.status(500).json({ error: 'Upload failed: ' + upErr.message })
  }

  // Public URL + DB update
  const { data: pub } = admin.storage.from('member-photos-public').getPublicUrl(stdPath)
  const stdUrl = pub.publicUrl
  const { error: dbErr } = await admin
    .from('members')
    .update({ photo_std: stdUrl })
    .eq('id', memberId)
  if (dbErr) {
    return res.status(500).json({ error: 'DB update failed: ' + dbErr.message })
  }

  return res.status(200).json({ ok: true, photo_std: stdUrl })
}
