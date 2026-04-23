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

// ── Schema ─────────────────────────────────────────────────────────────────────

const BaseSchema = z.object({
  title:        z.string().min(1, 'Title is required').max(100),
  amount:       z.number().positive().finite(),
  paid_by:      z.string().uuid(),
  participants: z.array(z.string().uuid())
                 .min(2)
                 .max(10)
                 .refine(a => new Set(a).size === a.length, 'Duplicate participants'),
  category:     z.string().max(50).default('general'),
  group_id:     z.string().uuid().nullable().optional(),
  date:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  due_date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  note:         z.string().max(500).nullable().optional(),
})

const ExactSchema = BaseSchema.extend({
  split_type: z.literal('exact'),
  exact_amounts: z.record(z.string().uuid(), z.number().nonnegative()),
})

const PercentageSchema = BaseSchema.extend({
  split_type: z.literal('percentage'),
  percentages: z.record(z.string().uuid(), z.number().nonnegative()),
})

const Schema = z.discriminatedUnion('split_type', [
  ExactSchema,
  PercentageSchema,
])

const DB_ERRORS: Record<string, string> = {
  SS001: 'At least 2 participants required',
  SS002: 'Maximum 10 participants allowed',
  SS003: 'paid_by must be included in participants',
  SS004: 'Internal: split amounts do not sum to expense total',
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405)

  try {
    // 1) Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401)

    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Unauthorized' }, 401)
      
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    )

    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    // 2) Parse + validate
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const parsed = Schema.safeParse(raw)
    if (!parsed.success) {
      return json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        400,
      )
    }

    const input = parsed.data

    if (!input.participants.includes(input.paid_by)) {
      return json({ error: 'paid_by must be included in participants' }, 400)
    }

    const participants = input.participants
    const amount = input.amount

    type SplitRow = { user_id: string; amount: number; percentage: number | null }
    let splits: SplitRow[] = []

    const toCents = (n: number) => Math.round(n * 100)
    const fromCents = (c: number) => c / 100

    // 3) Exact split
    if (input.split_type === 'exact') {
      const exact = input.exact_amounts

      const missing = participants.filter(id => !(id in exact))
      const extra = Object.keys(exact).filter(id => !participants.includes(id))

      if (missing.length > 0 || extra.length > 0) {
        return json({ error: 'exact_amounts keys must match participants exactly' }, 400)
      }

      let sumCents = 0
      for (const id of participants) {
        const v = exact[id]
        if (typeof v !== 'number' || v < 0) {
          return json({ error: 'All exact amounts must be non-negative numbers' }, 400)
        }
        sumCents += toCents(v)
      }

      const totalCents = toCents(amount)
      if (sumCents !== totalCents) {
        return json(
          {
            error: `Exact amounts sum to ${fromCents(sumCents).toFixed(2)} but expense total is ${amount.toFixed(2)}`,
          },
          400,
        )
      }

      splits = participants.map(id => ({
        user_id: id,
        amount: exact[id],
        percentage: null,
      }))
    }

    // 4) Percentage split
    if (input.split_type === 'percentage') {
      const pctMap = input.percentages

      const missing = participants.filter(id => !(id in pctMap))
      const extra = Object.keys(pctMap).filter(id => !participants.includes(id))

      if (missing.length > 0 || extra.length > 0) {
        return json({ error: 'percentages keys must match participants exactly' }, 400)
      }

      let pctSum = 0
      for (const id of participants) {
        const p = pctMap[id]
        if (typeof p !== 'number' || p < 0) {
          return json({ error: 'All percentages must be non-negative numbers' }, 400)
        }
        pctSum += p
      }

      const tolerance = 0.0001
      if (Math.abs(pctSum - 100) > tolerance) {
        return json(
          {
            error: `Percentages sum to ${pctSum.toFixed(2)}% but must equal 100%`,
          },
          400,
        )
      }

      const totalCents = toCents(amount)
      const baseSplits: { user_id: string; cents: number; percentage: number }[] = []
      let allocatedCents = 0

      for (const id of participants) {
        const pct = pctMap[id]
        const cents = Math.round((pct / 100) * totalCents)
        baseSplits.push({ user_id: id, cents, percentage: pct })
        allocatedCents += cents
      }

      let remainder = totalCents - allocatedCents
      if (remainder !== 0) {
        const idx = baseSplits.findIndex(s => s.user_id === input.paid_by)
        const target = idx >= 0 ? baseSplits[idx] : baseSplits[0]
        target.cents += remainder
      }

      splits = baseSplits.map(s => ({
        user_id: s.user_id,
        amount: fromCents(s.cents),
        percentage: s.percentage,
      }))
    }

    const p_splits = splits.map(s => ({
      user_id: s.user_id,
      amount: s.amount,
      percentage: s.percentage,
    }))

    // 5) Call DB RPC
    const svcClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data, error: rpcErr } = await svcClient.rpc('create_expense_with_splits', {
      p_title:      input.title,
      p_amount:     input.amount,
      p_category:   input.category,
      p_paid_by:    input.paid_by,
      p_group_id:   input.group_id  ?? null,
      p_date:       input.date      ?? new Date().toISOString().split('T')[0],
      p_due_date:   input.due_date  ?? null,
      p_note:       input.note      ?? null,
      p_created_by: user.id,
      p_splits,
    })

    if (rpcErr) {
      console.error('[create-expense] RPC error', rpcErr)
      const code = rpcErr.message?.match(/SS\d{3}/)?.[0]
      if (code && DB_ERRORS[code]) return json({ error: DB_ERRORS[code] }, 400)
      throw rpcErr
    }

    return json(data, 201)

  } catch (err: unknown) {
    console.error('[create-expense]', err)
    return json({ error: 'Internal server error' }, 500)
  }
})