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
    // Cache-bust so ImagePicker change reflects immediately
    return `${data.publicUrl}?t=${Date.now()}`
  } catch (e) {
    console.warn('[uploadAvatar] error:', e)
    return null
  }
}

/**
 * Stub — account deletion requires a Supabase Edge Function with admin privileges.
 * Tracked: SS-025
 */
export async function deleteAccount(
  _userId: string
): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Account deletion not yet available.' }
}
