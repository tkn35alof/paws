// PAWS — standardize-photo Edge Function
// Owner-only. Downloads the member's raw photo, re-uploads to the public
// bucket, writes the public URL back to members.photo_std.
//
// Deploy: supabase functions deploy standardize-photo
// (Or paste this file into the Supabase dashboard Edge Functions editor.)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS (so the browser can call us from the live site)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') {
    return new Response('Use POST', { status: 405, headers: cors })
  }

  try {
    // Get the caller's JWT from the Authorization header
    const authHeader = req.headers.get('Authorization') ?? ''
    const userJwt = authHeader.replace(/^Bearer\s+/i, '')

    // 1) Create a USER-scoped client to verify the caller is the owner
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    })
    const { data: userRes, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userRes.user) {
      return json({ error: 'unauthenticated' }, 401, cors)
    }
    const userId = userRes.user.id

    // 2) Check the user is the owner
    const { data: me, error: meErr } = await userClient
      .from('members').select('is_owner').eq('id', userId).single()
    if (meErr || !me?.is_owner) {
      return json({ error: 'owner only' }, 403, cors)
    }

    // 3) Get the member id from the request body
    const { memberId } = await req.json()
    if (!memberId) return json({ error: 'memberId required' }, 400, cors)

    // 4) Now switch to SERVICE_ROLE to bypass RLS for the storage work
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // 5) Read the member row to find photo_raw
    const { data: m, error: mErr } = await admin
      .from('members').select('photo_raw').eq('id', memberId).single()
    if (mErr || !m?.photo_raw) {
      return json({ error: 'no raw photo for member' }, 404, cors)
    }

    // 6) Download the raw photo
    const { data: rawBlob, error: dlErr } = await admin.storage
      .from('member-photos').download(m.photo_raw)
    if (dlErr || !rawBlob) {
      return json({ error: `download failed: ${dlErr?.message}` }, 500, cors)
    }

    // 7) Upload to the public bucket
    const stdPath = `${memberId}/std-${Date.now()}.jpg`
    const { error: upErr } = await admin.storage
      .from('member-photos-public').upload(stdPath, rawBlob, {
        cacheControl: '3600', upsert: true, contentType: 'image/jpeg',
      })
    if (upErr) {
      return json({ error: `upload failed: ${upErr.message}` }, 500, cors)
    }

    // 8) Get the public URL and write back to members
    const { data: pub } = admin.storage.from('member-photos-public').getPublicUrl(stdPath)
    const stdUrl = pub.publicUrl
    const { error: dbErr } = await admin
      .from('members').update({ photo_std: stdUrl }).eq('id', memberId)
    if (dbErr) {
      return json({ error: `db update failed: ${dbErr.message}` }, 500, cors)
    }

    return json({ ok: true, photo_std: stdUrl }, 200, cors)
  } catch (e) {
    return json({ error: String(e) }, 500, cors)
  }
})

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...headers },
  })
}
