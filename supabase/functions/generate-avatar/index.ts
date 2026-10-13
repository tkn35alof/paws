// PAWS — generate-avatar edge function (Vercel proxy relay)
// Deploy: supabase functions deploy generate-avatar
// Set secret: supabase secrets set HF_TOKEN=<your-token>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing internal system environment keys.')
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // Normalize path
    let cleanPath = photoRaw
    if (cleanPath.includes('member-photos-public/')) {
      cleanPath = cleanPath.split('member-photos-public/')[1]
    }
    console.log(`Attempting to generate a secure signed URL for cleaned path: "${cleanPath}"`)

    // Generate signed URL with dual-bucket fallback
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
    console.log('Successfully generated time-limited token URL.')

    // Route through Vercel proxy to bypass Supabase Edge DNS sandbox
    const proxyEndpoint = 'https://paws-temp.vercel.app/api/generate-avatar'
    console.log(`Routing asset through Vercel proxy: ${proxyEndpoint}`)

    let hfRes = null
    const MAX_RETRIES = 3
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 120000)
        hfRes = await fetch(proxyEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ securePhotoUrl }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)
        if (hfRes.ok) break
        console.warn(`Proxy attempt ${attempt} returned status: ${hfRes.status}`)
      } catch (retryErr) {
        console.warn(`Proxy fetch attempt ${attempt} failed:`, retryErr.message)
        if (attempt === MAX_RETRIES) throw retryErr
        await new Promise(r => setTimeout(r, 2000 * attempt))
      }
    }

    if (!hfRes || !hfRes.ok) {
      const errText = hfRes ? await hfRes.text() : 'Network timeout'
      throw new Error(`Proxy inference exhausted: ${errText}`)
    }

    // Capture GLB binary
    const glbBlob = await hfRes.blob()
    console.log(`Received GLB blob: ${glbBlob.size} bytes, type=${glbBlob.type}`)

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