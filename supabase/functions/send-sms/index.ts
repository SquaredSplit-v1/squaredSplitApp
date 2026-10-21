/**
 * Supabase Auth "Send SMS" hook.
 *
 * Supabase generates and verifies the OTP (rate limits, expiry, test numbers
 * all stay in Supabase); this function only DELIVERS the code. That lets us
 * use any SMS gateway instead of Twilio — MSG91 is wired in by default (India-
 * first: cheap, DLT-compliant), and adding another provider is one function.
 *
 * Routing is per recipient region:
 *   +91 (India)  → MSG91   (DLT templates)
 *   +1 and rest  → Vonage  (US-capable SMS)
 * SMS_PROVIDER overrides the route when set ("msg91" | "vonage" | "log").
 *
 * Secrets (supabase secrets set …):
 *   SEND_SMS_HOOK_SECRET  shared secret Supabase sends with the hook call
 *   SMS_PROVIDER          optional forced route: "msg91" | "vonage" | "log"
 *   -- MSG91 (Indian numbers) --
 *   MSG91_AUTH_KEY        MSG91 account auth key
 *   MSG91_TEMPLATE_ID     DLT-approved OTP template id (variable: ##OTP##)
 *   MSG91_SENDER_ID       6-char DLT sender id (optional for v5 flow)
 *   -- Vonage (US / international) --
 *   VONAGE_API_KEY        Vonage account API key
 *   VONAGE_API_SECRET     Vonage account API secret
 *   VONAGE_FROM_NUMBER    purchased US sender number, digits (e.g. 14155550123)
 */

interface HookPayload {
  user?: { id?: string; phone?: string }
  sms?: { otp?: string }
  otp?: string
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/**
 * Supabase Auth hooks follow the Standard Webhooks spec: the raw body is
 * signed with HMAC-SHA256 over `${webhook-id}.${webhook-timestamp}.${body}`
 * using the secret after the `whsec_` prefix (base64). A bearer token with
 * the raw secret is also accepted for manual testing.
 */
async function verifySignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  const bearerMatch = auth.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch && bearerMatch[1].trim() === secret) return true

  const id = req.headers.get('webhook-id')
  const timestamp = req.headers.get('webhook-timestamp')
  const signatureHeader = req.headers.get('webhook-signature')
  if (!id || !timestamp || !signatureHeader) return false

  // Reject stale deliveries (5 min window) to blunt replay attempts.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false

  const keyB64 = secret.replace(/^v1,?\s*/, '').replace(/^whsec_/, '')
  const keyBytes = Uint8Array.from(atob(keyB64), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const mac = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`)
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  // Header may carry several space-separated "v1,<sig>" entries.
  return signatureHeader
    .split(' ')
    .map(part => part.replace(/^v1,/, ''))
    .some(sig => sig === expected)
}

/** Digits only, no leading +; MSG91 wants country code included (91XXXXXXXXXX). */
function toMsg91Mobile(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length === 10 ? `91${digits}` : digits
}

async function sendViaMsg91(phone: string, otp: string): Promise<void> {
  const authKey = Deno.env.get('MSG91_AUTH_KEY')
  const templateId = Deno.env.get('MSG91_TEMPLATE_ID')
  const senderId = Deno.env.get('MSG91_SENDER_ID')
  if (!authKey || !templateId) {
    throw new Error('MSG91 is not configured (MSG91_AUTH_KEY / MSG91_TEMPLATE_ID missing)')
  }

  const res = await fetch('https://control.msg91.com/api/v5/flow/', {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      template_id: templateId,
      ...(senderId ? { sender: senderId } : {}),
      short_url: '0',
      recipients: [{ mobiles: toMsg91Mobile(phone), OTP: otp, otp }],
    }),
  })

  const text = await res.text()
  if (!res.ok) throw new Error(`MSG91 HTTP ${res.status}: ${text.slice(0, 200)}`)
  let parsed: { type?: string; message?: string } = {}
  try {
    parsed = JSON.parse(text)
  } catch {
    // non-JSON success body is fine
  }
  if (parsed.type && parsed.type !== 'success') {
    throw new Error(`MSG91 rejected: ${parsed.message ?? text.slice(0, 200)}`)
  }
}

async function sendViaVonage(phone: string, otp: string): Promise<void> {
  const apiKey = Deno.env.get('VONAGE_API_KEY')
  const apiSecret = Deno.env.get('VONAGE_API_SECRET')
  const from = Deno.env.get('VONAGE_FROM_NUMBER')
  if (!apiKey || !apiSecret || !from) {
    throw new Error('Vonage is not configured (VONAGE_API_KEY / VONAGE_API_SECRET / VONAGE_FROM_NUMBER missing)')
  }

  const body = new URLSearchParams({
    api_key: apiKey,
    api_secret: apiSecret,
    to: phone.replace(/\D/g, ''),
    from,
    text: `Your SquaredSplit verification code is ${otp}. It expires in 5 minutes.`,
  })

  const res = await fetch('https://rest.nexmo.com/sms/json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = (await res.json()) as {
    messages?: { status?: string; 'error-text'?: string }[]
  }
  if (!res.ok) throw new Error(`Vonage HTTP ${res.status}`)
  const first = data.messages?.[0]
  if (!first || first.status !== '0') {
    throw new Error(`Vonage rejected: ${first?.['error-text'] ?? 'unknown error'}`)
  }
}

/** India → MSG91; everything else (US, …) → Vonage. Manual override wins. */
function routeFor(phone: string): 'msg91' | 'vonage' | 'log' {
  const override = (Deno.env.get('SMS_PROVIDER') ?? '').toLowerCase()
  if (override === 'msg91' || override === 'vonage' || override === 'log') {
    return override as 'msg91' | 'vonage' | 'log'
  }
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('91')) return 'msg91'
  if (digits.length === 10) return 'msg91' // bare local entry — India default
  return 'vonage'
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET')
  if (!secret) return json(500, { error: 'SEND_SMS_HOOK_SECRET not configured' })

  const rawBody = await req.text()
  if (!(await verifySignature(req, rawBody, secret))) {
    return json(401, { error: 'Unauthorized' })
  }

  let payload: HookPayload
  try {
    payload = JSON.parse(rawBody) as HookPayload
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const phone = payload.user?.phone
  const otp = payload.sms?.otp ?? payload.otp
  if (!phone || !otp) return json(400, { error: 'phone and otp are required' })

  try {
    const provider = routeFor(phone)
    if (provider === 'log') {
      console.log(`[send-sms] (log provider) OTP for ${phone}: ${otp}`)
    } else if (provider === 'vonage') {
      await sendViaVonage(phone, otp)
    } else {
      await sendViaMsg91(phone, otp)
    }
    return json(200, {})
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[send-sms] delivery failed:', message)
    // Non-2xx makes Supabase surface a send failure to the client.
    return json(500, { error: message })
  }
})
