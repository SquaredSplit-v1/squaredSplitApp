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

/**
 * Call this on logout to deregister the push token from the backend so the
 * user no longer receives push notifications after signing out.
 * Silently swallows errors — failing to deregister should never block logout.
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('notifications', {
      body: { action: 'unregister', token },
    })
    if (error) {
      console.warn('[push] unregisterPushToken', await getErrorMessage(error, data))
    }
  } catch (e) {
    console.warn('[push] unregisterPushToken', e)
  }
}
