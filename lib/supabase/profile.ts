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
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)

  if (error) return { success: false, error: error.message }
  return { success: true }
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
