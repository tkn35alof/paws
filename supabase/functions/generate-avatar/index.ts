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

const TRIPO_BASE = 'https://api.tripo3d.ai'
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
    const res = await fetch(`${TRIPO_BASE}/v1/task/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      throw new Error(`Tripo poll failed: ${res.status}`)
    }
    const data = await res.json()
    const status = data.status || data.data?.status || ''
    if (status === 'success' || status === 'completed') {
      return data
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`Tripo task failed: ${data.error || data.message || 'unknown'}`)
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

    // Download the photo from storage
    const { data: blob, error: dlErr } = await adminClient.storage
      .from('member-photos').download(photoRaw)
    if (dlErr) return json({ error: `Download failed: ${dlErr.message}` }, 500)

    // Convert to base64 data URL for Tripo
    const buf = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
    const dataUrl = `data:${blob.type || 'image/jpeg'};base64,${base64}`

    // Initialize Tripo3D task
    const initRes = await fetch(`${TRIPO_BASE}/v1/create_task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image_to_3d',
        image_url: dataUrl,
        model_version: '2.0',
        texture: '4K',
      }),
    })

    if (!initRes.ok) {
      const errText = await initRes.text()
      throw new Error(`Tripo init failed: ${initRes.status} - ${errText}`)
    }

    const initData = await initRes.json()
    const taskId = initData.task_id || initData.data?.task_id
    if (!taskId) {
      throw new Error('No task_id in Tripo response')
    }

    // Poll for completion
    const result = await pollTask(taskId, apiKey)

    // Extract GLB URL from success payload
    const modelUrl = result.output?.model || result.model_url || result.data?.output?.model
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
