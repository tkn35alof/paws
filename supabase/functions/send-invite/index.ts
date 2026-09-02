// PAWS — send-invite edge function
// Deploy: supabase functions deploy send-invite
// Admin clicks "Generate invite" in /admin → this function:
//   1) verifies owner
//   2) creates invite row (email-bound, single-use)
//   3) sends a magic-link-style email to the invitee with the signup link
//   4) returns { ok: true, code, link }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
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
    if (!authHeader) return json({ error: 'Missing auth' }, 401)

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user } } = await callerClient.auth.getUser()
    if (!user) return json({ error: 'Unauthorized' }, 401)

    // Verify owner
    const { data: me } = await callerClient.from('members')
      .select('is_owner').eq('id', user.id).single()
    if (!me?.is_owner) return json({ error: 'Not owner' }, 403)

    const { email } = await req.json()
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ error: 'Invalid email' }, 400)
    }

    // Admin client (service_role via SERVICE_ROLE_KEY secret)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Generate a 12-char code
    const code = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => b.toString(36)).join('').slice(0, 12).toUpperCase()

    // Check for an existing un-redeemed invite for this email; if exists, reuse its code
    const { data: existing } = await adminClient.from('invites')
      .select('id, code').eq('email', email.toLowerCase()).is('redeemed_at', null)
      .maybeSingle()

    let finalCode = code
    if (existing?.code) {
      finalCode = existing.code
    } else {
      const { error: insErr } = await adminClient.from('invites').insert({
        code,
        email: email.toLowerCase(),
        created_by: user.id,
      })
      if (insErr) return json({ error: `DB error: ${insErr.message}` }, 500)
    }

    // Send the invite email via Supabase's built-in OTP sender.
    // This uses the project's "Site URL" + redirect config to build the link.
    // We pass a custom redirect that points to our /login?invite=CODE page.
    const origin = req.headers.get('Origin') || Deno.env.get('SITE_ORIGIN') || 'https://paws-temp.vercel.app'
    const inviteLink = `${origin}/login?invite=${finalCode}`

    // Use signInWithOtp to trigger an email send. The user won't actually
    // "sign in" via this — they land on /login which then does the normal
    // signup flow because the invite is what gates account creation.
    // We pass shouldCreateUser: false so no auth user is created at this stage.
    const { error: otpErr } = await adminClient.auth.signInWithOtp({
      email: email.toLowerCase(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: inviteLink,
      },
    })
    if (otpErr) {
      // Fall back: return success but log the link so admin can copy
      console.log('OTP send failed:', otpErr.message)
      return json({ ok: true, code: finalCode, link: inviteLink, warning: `Email send failed: ${otpErr.message}. Share link manually.` }, 200)
    }

    return json({ ok: true, code: finalCode, link: inviteLink }, 200)
  } catch (e) {
    return json({ error: e.message }, 500)
  }
})

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
