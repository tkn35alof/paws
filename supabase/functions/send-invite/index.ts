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

    // Admin client (service_role via SERVICE_ROLE_KEY secret, fallback to
    // the Supabase-managed SUPABASE_SERVICE_ROLE_KEY which is auto-injected)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
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

    // Send the invite email via Resend (primary). Falls back to Supabase OTP.
    const origin = req.headers.get('Origin') || Deno.env.get('SITE_ORIGIN') || 'https://paws-temp.vercel.app'
    const inviteLink = `${origin}/login?invite=${finalCode}`
    const resendKey = Deno.env.get('RESEND_API_KEY') || ''

    if (resendKey) {
      // Free-tier Resend accounts can only send to their own email until a
      // domain is verified. Fall back to the sandbox sender so the function
      // still works; the invite link is always returned for manual sharing.
      const fromEmail = Deno.env.get('FROM_EMAIL') || 'PAWS <onboarding@resend.dev>'
      const sent = await sendViaResend(resendKey, email.toLowerCase(), inviteLink, fromEmail)
      if (!sent.ok) {
        console.log('Resend send failed:', sent.status, sent.body)
        return json({ ok: true, code: finalCode, link: inviteLink, warning: `Email send failed (HTTP ${sent.status}). Share link manually.` }, 200)
      }
      return json({ ok: true, code: finalCode, link: inviteLink, emailSent: true }, 200)
    }

    // Fallback: Supabase OTP. shouldCreateUser: true because the invite flow
        // creates the account — the user lands on /login?invite=CODE which then
        // completes signup. shouldCreateUser: false returns otp_disabled.
        const { error: otpErr } = await adminClient.auth.signInWithOtp({
          email: email.toLowerCase(),
          options: { shouldCreateUser: true, emailRedirectTo: inviteLink },
        })
    if (otpErr) {
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

// Send an invite email via the Resend API. Returns { ok, status, body }.
async function sendViaResend(apiKey, to, link, from) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: 'You have been invited to PAWS',
        html: inviteEmailHtml(link),
      }),
    })
    const body = await res.text()
    if (!res.ok) return { ok: false, status: res.status, body }
    return { ok: true, status: res.status, body }
  } catch (e) {
    return { ok: false, status: 0, body: e.message }
  }
}

function inviteEmailHtml(link) {
  return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 20px;">
  <div style="margin-bottom: 24px;">
    <span style="display: inline-block; font-size: 22px; font-weight: 700; letter-spacing: 0.04em; color: #e91e63;">PAWS</span>
    <span style="display: inline-block; font-size: 13px; color: #888; margin-left: 8px; vertical-align: super;">Professional Allied Workforce Services</span>
  </div>

  <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px;">You have been invited to join PAWS</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #444; margin: 0 0 24px;">
    A team member has invited you to join the PAWS member portal. Create your account to set up your profile, upload a professional portrait, and appear on the public team grid.
  </p>

  <div style="margin: 0 0 28px;">
    <a href="${link}" style="display: inline-block; background: #e91e63; color: #fff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 13px 26px; border-radius: 4px;">
      Create your account
    </a>
  </div>

  <p style="font-size: 13px; color: #999; line-height: 1.5; margin: 0 0 16px;">
    If the button above does not work, copy and paste this link into your browser:<br>
    <a href="${link}" style="color: #e91e63;">${link}</a>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 28px 0;">

  <p style="font-size: 12px; color: #aaa; margin: 0;">
    This invite was sent by the PAWS team owner. If you were not expecting this email, you can safely ignore it.
  </p>
</body>
</html>`
}
