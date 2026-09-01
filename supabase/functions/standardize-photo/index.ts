// PAWS — standardize-photo edge function
// Deploy: supabase functions deploy standardize-photo
// Set secret: supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
// Then the admin "Standardize" button in /admin calls this function via the
// browser; the function uses service_role to bypass RLS for the storage copy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Missing auth', { status: 401 })

    // Caller client: verifies the requester is the owner
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Verify ownership via the members table (call as caller, RLS allows self-read)
    const { data: me } = await callerClient
      .from('members').select('is_owner').eq('id', user.id).single()
    if (!me?.is_owner) return new Response('Not owner', { status: 403 })

    const { memberId, photoRaw } = await req.json()
    if (!memberId || !photoRaw) {
      return new Response('Missing memberId or photoRaw', { status: 400 })
    }

    // Admin client with service_role: bypasses RLS for the storage operations
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Download raw photo (admin: no RLS)
    const { data: blob, error: dlErr } = await adminClient.storage
      .from('member-photos').download(photoRaw)
    if (dlErr) return new Response(`Download failed: ${dlErr.message}`, { status: 500 })

    // Upload to public bucket (admin: no RLS)
    const stdPath = `${memberId}/std-${Date.now()}.jpg`
    const { error: upErr } = await adminClient.storage
      .from('member-photos-public').upload(stdPath, blob, {
        cacheControl: '3600', upsert: true, contentType: 'image/jpeg',
      })
    if (upErr) return new Response(`Upload failed: ${upErr.message}`, { status: 500 })

    // Get public URL
    const { data: pub } = adminClient.storage.from('member-photos-public').getPublicUrl(stdPath)
    const stdUrl = pub.publicUrl

    // Update the member row (admin: bypasses RLS)
    const { error: updErr } = await adminClient.from('members')
      .update({ photo_std: stdUrl }).eq('id', memberId)
    if (updErr) return new Response(`Update failed: ${updErr.message}`, { status: 500 })

    return new Response(JSON.stringify({ ok: true, photo_std: stdUrl }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (e) {
    return new Response(`Error: ${e.message}`, { status: 500 })
  }
})
