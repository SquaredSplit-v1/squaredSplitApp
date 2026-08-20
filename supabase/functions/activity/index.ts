import '@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

interface ActivityCursor {
  created_at: string
  id: number
}

interface ActivityItem {
  id: number
  type: string
  metadata: Record<string, unknown>
  seen: boolean
  created_at: string
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getPathFromRequest(url: URL): string {
  const path = url.pathname.replace('/activity', '')
  return path === '' ? '/' : path
}

function parseLimit(rawLimit: string | null): number {
  const parsed = Number(rawLimit ?? '20')
  if (!Number.isFinite(parsed)) {
    return 20
  }

  return Math.min(100, Math.max(1, Math.trunc(parsed)))
}

function encodeCursor(cursor: ActivityCursor): string {
  return btoa(JSON.stringify(cursor))
}

function decodeCursor(rawCursor: string | null): ActivityCursor | null {
  if (!rawCursor) {
    return null
  }

  try {
    const parsed = JSON.parse(atob(rawCursor))
    const id = Number(parsed?.id)
    if (typeof parsed?.created_at !== 'string' || !Number.isInteger(id) || id <= 0) {
      return null
    }

    return {
      created_at: parsed.created_at,
      id,
    }
  } catch {
    return null
  }
}

function parseMarkSeenIds(body: unknown): { ids: number[]; invalid: boolean } {
  if (!body || typeof body !== 'object') {
    return { ids: [], invalid: false }
  }

  if (!('ids' in body)) {
    return { ids: [], invalid: false }
  }

  const rawIds = (body as { ids?: unknown }).ids
  if (!Array.isArray(rawIds)) {
    return { ids: [], invalid: true }
  }

  const ids: number[] = []
  for (const rawId of rawIds) {
    const parsedId = Number(rawId)
    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      return { ids: [], invalid: true }
    }
    ids.push(parsedId)
  }

  return { ids: Array.from(new Set(ids)), invalid: false }
}

function decodeBase64Url(value: string): string {
  const padded = value
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=')
  return atob(padded)
}

function getUserIdFromAuthHeader(authHeader: string): string | null {
  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = JSON.parse(decodeBase64Url(parts[1]))
    return typeof payload?.sub === 'string' ? payload.sub : null
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401)
  }

  const userId = getUserIdFromAuthHeader(authHeader)
  if (!userId) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401)
  }

  const url = new URL(req.url)
  const path = getPathFromRequest(url)

  try {
    if (req.method === 'GET' && (path === '/' || path === '/api/activity')) {
      const rawCursor = url.searchParams.get('cursor')
      const cursor = decodeCursor(rawCursor)
      if (rawCursor && !cursor) {
        return jsonResponse({ error: 'Invalid cursor' }, 400)
      }

      const limit = parseLimit(url.searchParams.get('limit'))

      const { data, error } = await adminClient.rpc('get_activity_feed_page', {
        p_user_id: userId,
        p_limit: limit,
        p_cursor_created_at: cursor?.created_at ?? null,
        p_cursor_id: cursor?.id ?? null,
      })

      if (error) {
        return jsonResponse({ error: 'Failed to fetch activity feed' }, 500)
      }

      const rows = (Array.isArray(data) ? data : []) as ActivityItem[]
      const hasMore = rows.length > limit
      const items = hasMore ? rows.slice(0, limit) : rows
      const lastItem = items.length > 0 ? items[items.length - 1] : null

      const nextCursor =
        hasMore && lastItem
          ? encodeCursor({ created_at: lastItem.created_at, id: lastItem.id })
          : null

      return jsonResponse({
        items,
        page_info: {
          limit,
          has_more: hasMore,
          next_cursor: nextCursor,
        },
      })
    }

    if (
      (req.method === 'POST' || req.method === 'PATCH') &&
      (path === '/seen' || path === '/api/activity/seen')
    ) {
      const body = await req.json().catch(() => ({}))
      const { ids, invalid } = parseMarkSeenIds(body)
      if (invalid) {
        return jsonResponse({ error: 'ids must be an array of positive integers' }, 400)
      }

      const markAll =
        typeof body === 'object' &&
        body !== null &&
        'mark_all' in body &&
        (body as { mark_all?: unknown }).mark_all === true

      if (ids.length === 0 && !markAll) {
        return jsonResponse({ error: 'Provide ids or set mark_all=true' }, 400)
      }

      const { data, error } = await adminClient.rpc('mark_activity_feed_seen', {
        p_user_id: userId,
        p_activity_ids: markAll ? null : ids,
      })

      if (error) {
        return jsonResponse({ error: 'Failed to update activity status' }, 500)
      }

      return jsonResponse({
        success: true,
        marked_count: Number(data ?? 0),
      })
    }

    return jsonResponse({ error: 'Not found' }, 404)
  } catch {
    return jsonResponse({ error: 'Request failed' }, 500)
  }
})
