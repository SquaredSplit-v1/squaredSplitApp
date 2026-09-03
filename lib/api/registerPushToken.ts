import { Platform } from 'react-native'

import { supabase } from '@/lib/supabase'

/**
 * Register (or refresh) the caller's Expo push token in the device_tokens
 * table. Writes go through PostgREST with the user's JWT, so no Edge Function
 * is needed.
 */
export async function registerPushToken(token: string | null): Promise<void> {
  if (!token) return

  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) return

  const { data: existing, error: selectError } = await supabase
    .from('device_tokens')
    .select('id')
    .eq('token', token)
    .maybeSingle()

  if (selectError) {
    console.warn('[push] registerPushToken lookup', selectError.message)
    return
  }

  if (existing) {
    const { error: updateError } = await supabase
      .from('device_tokens')
      .update({ user_id: userId, platform: Platform.OS })
      .eq('token', token)
    if (updateError) {
      console.warn('[push] registerPushToken update', updateError.message)
    }
    return
  }

  const { error: insertError } = await supabase.from('device_tokens').insert({
    token,
    user_id: userId,
    platform: Platform.OS,
  })

  if (insertError) {
    console.warn('[push] registerPushToken insert', insertError.message)
  }
}

/**
 * Call this on logout to deregister the push token from the backend so the
 * user no longer receives push notifications after signing out.
 * Silently swallows errors — failing to deregister should never block logout.
 */
export async function unregisterPushToken(token: string): Promise<void> {
  try {
    const { error } = await supabase.from('device_tokens').delete().eq('token', token)
    if (error) {
      console.warn('[push] unregisterPushToken', error.message)
    }
  } catch (e) {
    console.warn('[push] unregisterPushToken', e)
  }
}
