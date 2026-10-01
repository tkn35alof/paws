// PAWS — generate-avatar edge function (Hugging Face Stable Fast 3D)
// Deploy: supabase functions deploy generate-avatar
// Set secret: supabase secrets set HF_TOKEN=<your-huggingface-token>
// Set secret: supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const HF_MODEL = 'stabilityai/stable-fast-3d'
const HF_API_URL = `https://hf.space/models/${HF_MODEL}`

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight OPTIONS must be handled before anything else
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing auth' }, 401)

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    const { memberId, photoRaw, syncAvatarOnUpdate } = await req.json()
    console.log(`Processing avatar for member: ${memberId}, sync flag: ${syncAvatarOnUpdate}`)

    if (!memberId || !photoRaw) {
      return json({ error: 'Missing memberId or photoRaw' }, 400)
    }
    if (memberId !== user.id) {
      return json({ error: 'Can only generate avatar for yourself' }, 403)
    }
    if (!syncAvatarOnUpdate) {
      return json({ ok: true, skipped: true, reason: 'sync_avatar_on_update is false' })
    }

    const hfToken = Deno.env.get('HF_TOKEN') || ''
    if (!hfToken) {
      return json({ ok: true, skipped: true, reason: 'HF_TOKEN not configured' })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Normalize the file path string — strip any redundant full URL prefixes
    let cleanPath = photoRaw
    if (cleanPath.includes('member-photos-public/')) {
      cleanPath = cleanPath.split('member-photos-public/')[1]
    }
    console.log(`Attempting to generate a secure signed URL for cleaned path: "${cleanPath}"`)

    // Generate the temporary secure access link using the cleaned path string
    let securePhotoUrl = ''
    const { data: signedData, error: signedErr } = await adminClient.storage
      .from('member-photos-public')
      .createSignedUrl(cleanPath, 900)

    if (signedErr || !signedData?.signedUrl) {
      console.log('Path not found in public bucket. Falling back to verify private member-photos container...')
      const { data: fallbackData, error: fallbackErr } = await adminClient.storage
        .from('member-photos')
        .createSignedUrl(cleanPath, 900)

      if (fallbackErr || !fallbackData?.signedUrl) {
        throw new Error(`Failed to create secure signed URL in both containers: ${signedErr?.message || fallbackErr?.message}`)
      }
      securePhotoUrl = fallbackData.signedUrl
    } else {
      securePhotoUrl = signedData.signedUrl
    }
    console.log('Successfully generated time-limited token URL for Hugging Face.')

    // Call Hugging Face Stable Fast 3D serverless inference API
    // Returns raw GLB binary directly in the response body — no polling needed
    const hfRes = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: securePhotoUrl,
      }),
    })

    if (!hfRes.ok) {
      const errText = await hfRes.text()
      throw new Error(`Hugging Face inference failed: ${hfRes.status} - ${errText}`)
    }

    // Capture the raw GLB binary blob directly from the response
    const glbBlob = await hfRes.blob()
    console.log(`Received GLB blob from Hugging Face: ${glbBlob.size} bytes, type=${glbBlob.type}`)

    // Upload to avatars bucket
    const modelPath = `${user.id}/avatar-${Date.now()}.glb`
    const { error: upErr } = await adminClient.storage
      .from('avatars').upload(modelPath, glbBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'model/gltf-binary',
      })

    let finalUrl = ''
    if (!upErr) {
      const { data: pub } = adminClient.storage.from('avatars').getPublicUrl(modelPath)
      finalUrl = pub.publicUrl
    } else {
      console.warn('Avatar upload failed:', upErr.message)
    }

    // Update member row
    const { error: updErr } = await adminClient.from('members')
      .update({ generated_avatar_url: finalUrl })
      .eq('id', user.id)

    if (updErr) {
      console.warn('Member update failed:', updErr.message)
    }

    return json({ ok: true, generated_avatar_url: finalUrl }, 200)

  } catch (e) {
    console.error('Avatar generation error:', e.message)
    return json({ ok: false, error: e.message, generated_avatar_url: '' }, 200)
  }
})