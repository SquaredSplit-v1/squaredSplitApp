/**
 * Push dispatch — called by the on_activity_feed_insert DB trigger (pg_net)
 * whenever a notification-worthy event lands in activity_feed. Sends Expo
 * push notifications to every device registered for the recipient.
 *
 * Authenticated by the PUSH_DISPATCH_SECRET bearer token (same pattern as
 * send-sms / reminders); no user JWT exists in a trigger context.
 *
 * Secrets (supabase secrets set …):
 *   PUSH_DISPATCH_SECRET  shared secret the trigger sends
 *   EXPO_ACCESS_TOKEN     optional Expo push token (recommended for prod volume)
 */

interface FeedPayload {
  user_id?: string
  type?: string
  metadata?: Record<string, unknown>
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

function str(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function compose(
  type: string,
  meta: Record<string, unknown>,
  userId: string,
): { title: string; body: string } | null {
  const who = str(meta.actor_name) || 'Someone'
  const amount = num(meta.share_amount ?? meta.amount)
  const amountLabel = amount.toFixed(2)
  const title = str(meta.description) || 'Expense'

  switch (type) {
    case 'expense_participant_added': {
      // "paid" direction: the payer is someone else → you owe them.
      const youOwe = str(meta.paid_by) !== '' && str(meta.paid_by) !== userId
      return {
        title: `${who} added you to an expense`,
        body: `${title} · ${youOwe ? `you owe ${amountLabel}` : `you are owed ${amountLabel}`}`,
      }
    }
    case 'group_join_request':
      return {
        title: 'Group join request',
        body: `${who} wants to join ${str(meta.group_name) || 'a group'}`,
      }
    case 'group_member_approved':
      return { title: 'Request approved', body: `You are now a member of ${str(meta.group_name) || 'the group'}` }
    case 'group_settled':
      return { title: 'Squared up', body: `${who} squared up in ${str(meta.group_name) || 'your group'}` }
    case 'settlement_created':
      return { title: 'Payment recorded', body: `${who} marked a payment of ${amountLabel}` }
    case 'expense_created':
      return { title: 'New expense', body: `${who} added "${title}"` }
    default:
      return null
  }
}

async function fetchTokens(supabaseUrl: string, serviceKey: string, userId: string): Promise<string[]> {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${userId}&select=token`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  if (!res.ok) throw new Error(`device_tokens lookup failed: ${res.status}`)
  const rows = (await res.json()) as { token: string }[]
  return rows.map(r => r.token).filter(Boolean)
}

Deno.serve(async req => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const secret = Deno.env.get('PUSH_DISPATCH_SECRET')
  if (!secret) return json(500, { error: 'PUSH_DISPATCH_SECRET not configured' })

  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (token !== secret) return json(401, { error: 'Unauthorized' })

  let payload: FeedPayload
  try {
    payload = (await req.json()) as FeedPayload
  } catch {
    return json(400, { error: 'Invalid JSON' })
  }

  const userId = str(payload.user_id)
  const type = str(payload.type)
  const meta = payload.metadata ?? {}
  if (!userId || !type) return json(400, { error: 'user_id and type are required' })

  // AI reminders are delivered in-app by the Squarer tab; pushing them too
  // would double-notify.
  if (type === 'ai_reminder') return json(200, { skipped: 'ai_reminder' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) return json(500, { error: 'Missing Supabase env' })

  const message = compose(type, meta, userId)
  if (!message) return json(200, { skipped: type })

  try {
  // Resolve human-readable names for the message (service role bypasses RLS).
  const actorId = str(meta.created_by) || str(meta.paid_by) || str(meta.requester_id)
  if (actorId) {
    try {
      const pRes = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${actorId}&select=full_name`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      if (pRes.ok) {
        const rows = (await pRes.json()) as { full_name?: string | null }[]
        if (rows[0]?.full_name) meta.actor_name = rows[0].full_name
      }
    } catch {
      // fall back to 'Someone'
    }
  }
  const groupId = str(meta.group_id)
  if (groupId && !str(meta.group_name)) {
    try {
      const gRes = await fetch(
        `${supabaseUrl}/rest/v1/groups?id=eq.${groupId}&select=name`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
      )
      if (gRes.ok) {
        const rows = (await gRes.json()) as { name?: string | null }[]
        if (rows[0]?.name) meta.group_name = rows[0].name
      }
    } catch {
      // fall back to generic label
    }
  }

  let tokens: string[]
  try {
    tokens = await fetchTokens(supabaseUrl, serviceKey, userId)
  } catch (err) {
    return json(500, { error: err instanceof Error ? err.message : 'token lookup failed' })
  }
  if (tokens.length === 0) return json(200, { sent: 0, note: 'no registered devices' })

  const expoMessages = tokens.map(token_ => ({
    to: token_,
    title: message.title,
    body: message.body,
    sound: 'default' as const,
    data: { type, ...meta },
    channelId: 'default',
  }))

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN')
  if (expoAccessToken) headers.Authorization = `Bearer ${expoAccessToken}`

  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers,
    body: JSON.stringify(expoMessages),
  })
  const pushBody = await pushRes.text()

    if (!pushRes.ok) {
      console.error('[push-dispatch] expo error:', pushBody.slice(0, 300))
      return json(502, { error: 'Expo push failed', detail: pushBody.slice(0, 300) })
    }

    if (Deno.env.get('PUSH_DRY_RUN') === '1') {
      return json(200, { dryRun: true, wouldSend: expoMessages.length, first: expoMessages[0] ?? null })
    }

    return json(200, { sent: expoMessages.length })
  } catch (err) {
    console.error('[push-dispatch] failed:', err instanceof Error ? err.stack : err)
    return json(500, { error: err instanceof Error ? err.message : 'dispatch failed' })
  }
})
