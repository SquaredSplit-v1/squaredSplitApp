import { supabase } from '@/lib/supabase/client'

export interface ProfileUpdate {
  full_name?: string
  avatar_url?: string
}

/**
 * Save display name and/or avatar URL to the user's profile row.
 */
export async function saveProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{ success: boolean; error?: string }> {
  const payload: ProfileUpdate & {
    has_onboarded?: boolean
    onboarding_complete?: boolean
    updated_at?: string
  } = {
    ...updates,
    updated_at: new Date().toISOString(),
  }

  if (updates.full_name?.trim()) {
    payload.has_onboarded = true
    payload.onboarding_complete = true
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, has_onboarded, onboarding_complete')
    .eq('id', userId)
    .single()

  if (error) return null
  return data
}

/**
 * Upload avatar to Supabase Storage and return its public URL.
 * Bucket: avatars — must exist with public read policy in Supabase dashboard.
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string | null> {
  try {
    const ext = localUri.split('.').pop() ?? 'jpg'
    const path = `${userId}/avatar.${ext}`

    const response = await fetch(localUri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: `image/${ext}` })

    if (error) {
      console.warn('[uploadAvatar] upload failed:', error.message)
      return null
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`
  } catch (e) {
    console.warn('[uploadAvatar] error:', e)
    return null
  }
}

/**
 * Delete the authenticated user's account via an Edge Function that runs
 * with service-role privileges (supabase/functions/delete-account/index.ts).
 *
 * Flow:
 *  1. Call Edge Function — it deletes Storage files, DB rows, then auth user.
 *  2. On success the client session will be invalidated; authStore SIGNED_OUT
 *     handler takes care of resetting all stores and routing to login.
 *  3. On failure, return the error message so the caller can surface it.
 */
export async function deleteAccount(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      body: { userId },
    })

    if (error) {
      // Try to extract a human-readable message from the function response body
      let msg = error.message
      if (error.context) {
        try {
          const body = (await (error.context as Response).json()) as { error?: string }
          if (typeof body.error === 'string' && body.error.trim()) msg = body.error
        } catch { /* ignore parse errors */ }
      }
      return { success: false, error: msg }
    }

    if (data && typeof data === 'object' && 'error' in data) {
      return { success: false, error: String((data as { error: unknown }).error) }
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Unexpected error' }
  }
}
