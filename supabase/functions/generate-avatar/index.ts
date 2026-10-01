// PAWS — generate-avatar edge function (Tripo3D pipeline)
// Deploy: supabase functions deploy generate-avatar
// Set secret: supabase secrets set TRIPO_API_KEY=<your-tripo-key>
// Set secret: supabase secrets set SERVICE_ROLE_KEY=<your-service-role-key>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TRIPO_BASE = 'https://openapi.tripo3d.ai/v3'
const POLL_INTERVAL_MS = 4000
const MAX_POLL_ATTEMPTS = 45

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function pollTask(taskId, apiKey) {
  for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
    const res = await fetch(`${TRIPO_BASE}/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      throw new Error(`Tripo poll failed: ${res.status}`)
    }
    const data = await res.json()
    const status = data.data?.status
    if (status === 'success' || status === 'completed') {
      return data
    }
    if (status === 'failed' || status === 'error') {
      throw new Error('Tripo processing failed')
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error('Tripo poll timed out')
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

    const apiKey = Deno.env.get('TRIPO_API_KEY') || ''
    if (!apiKey) {
      return json({ ok: true, skipped: true, reason: 'TRIPO_API_KEY not configured' })
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get the public URL of the photo from storage
    const { data: imgData, error: urlErr } = adminClient.storage
      .from('member-photos').getPublicUrl(photoRaw)
    if (urlErr || !imgData?.publicUrl) {
      return json({ error: `Failed to get public URL: ${urlErr?.message || 'no URL'}` }, 500)
    }
    const publicPhotoUrl = imgData.publicUrl

    // Initialize Tripo3D V3 task
    const initRes = await fetch(`${TRIPO_BASE}/generation/image-to-model`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'v3.1-20260211',
        file: {
          type: 'url',
          url: publicPhotoUrl,
        },
      }),
    })

    if (!initRes.ok) {
      const errText = await initRes.text()
      throw new Error(`Tripo init failed: ${initRes.status} - ${errText}`)
    }

    const initJson = await initRes.json()
    const taskId = initJson.data?.task_id
    if (!taskId) {
      throw new Error(`Failed to get task ID: ${JSON.stringify(initJson)}`)
    }

    // Poll for completion
    const result = await pollTask(taskId, apiKey)

    // Extract GLB URL from success payload (V3 response shape)
    const modelUrl = result.data?.output?.model_url
    if (!modelUrl) {
      throw new Error('No model URL in Tripo success response')
    }

    // Download the GLB file
    const glbRes = await fetch(modelUrl)
    if (!glbRes.ok) {
      throw new Error(`GLB download failed: ${glbRes.status}`)
    }
    const glbBlob = await glbRes.blob()

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
