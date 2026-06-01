import { FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

async function getErrorMessage(error: unknown, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data) {
    const e = (data as { error?: unknown }).error
    if (typeof e === 'string' && e.trim()) return e
  }

  if (error instanceof FunctionsHttpError && error.context) {
    try {
      const body = (await error.context.json()) as { error?: string }
      if (typeof body.error === 'string' && body.error.trim()) return body.error
    } catch {
      // ignore
    }
  }

  if (error instanceof Error && error.message) return error.message
  return 'Failed to register push token'
}

export async function registerPushToken(token: string | null): Promise<void> {
  const { data, error } = await supabase.functions.invoke('notifications', {
    body: { action: 'register', token },
  })

  if (error) throw new Error(await getErrorMessage(error, data))
}
