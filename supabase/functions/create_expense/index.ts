import { serve }        from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z }            from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })

const Schema = z.object({
  title:        z.string().min(1, 'Title is required').max(100),
  amount:       z.number().positive().finite(),
  paid_by:      z.string().uuid(),
  participants: z.array(z.string().uuid()).min(2).max(10)
                 .refine(a => new Set(a).size === a.length, 'Duplicate participants'),
  category:     z.string().max(50).default('general'),
  group_id:     z.string().uuid().nullable().optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note:         z.string().max(500).nullable().optional(),
})

const DB_ERRORS: Record<string, string> = {
  SS001: 'At least 2 participants required',
  SS002: 'Maximum 10 participants allowed',
  SS003: 'paid_by must be included in participants',
  SS004: 'Internal: split amounts do not sum to expense total',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  try {
    // 1 ── Verify JWT ─────────────────────────────────────────────────────────
    const auth = req.headers.get('Authorization')
    if (!auth) return json({ error: 'Missing Authorization header' }, 401)

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    )
    const { data: { user }, error: authErr } = await anonClient.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // 2 ── Parse + Zod validate ───────────────────────────────────────────────
    let raw: unknown
    try { raw = await req.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

    const parsed = Schema.safeParse(raw)
    if (!parsed.success)
      return json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, 400)

    const input = parsed.data

    // 3 ── Business rule: paid_by must be in participants ─────────────────────
    if (!input.participants.includes(input.paid_by))
      return json({ error: 'paid_by must be included in participants' }, 400)

    // 4 ── Call atomic DB function ────────────────────────────────────────────
    const svcClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error: rpcErr } = await svcClient.rpc('create_expense_equal', {
      p_title:        input.title,
      p_amount:       input.amount,
      p_category:     input.category,
      p_paid_by:      input.paid_by,
      p_participants: input.participants,
      p_group_id:     input.group_id  ?? null,
      p_date:         input.date      ?? new Date().toISOString().split('T')[0],
      p_due_date:     input.due_date  ?? null,
      p_note:         input.note      ?? null,
      p_created_by:   user.id,
    })

    if (rpcErr) {
      const code = rpcErr.message.match(/SS\d{3}/)?.[0]
      if (code && DB_ERRORS[code]) return json({ error: DB_ERRORS[code] }, 400)
      throw rpcErr
    }

    // 5 ── 201 Created ────────────────────────────────────────────────────────
    return json(data, 201)

  } catch (err: unknown) {
    console.error('[create-expense]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})