import { supabase } from './supabase/client'

export interface ProfileUpdateData {
  full_name: string
  avatar_url?: string | null
}

export interface SaveProfileResult {
  success: boolean
  error?: string
}

// ─── Upload avatar to Supabase Storage ────────────────────────────────────────

export async function uploadAvatar(userId: string, imageUri: string): Promise<string | null> {
  try {
    const ext = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg'
    const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
    const filePath = `${userId}/avatar.${ext}`

    // Fetch the local URI as a blob — works reliably on iOS and Android
    const response = await fetch(imageUri)
    const blob = await response.blob()

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, { contentType: mimeType, upsert: true })

    if (error) {
      console.error('uploadAvatar error:', error.message)
      return null
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return data.publicUrl
  } catch (e) {
    console.error('uploadAvatar caught:', e)
    return null
  }
}

// ─── Save profile to DB + mark onboarding complete ────────────────────────────

export async function saveProfile(
  userId: string,
  data: ProfileUpdateData
): Promise<SaveProfileResult> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name.trim(),
        avatar_url: data.avatar_url ?? null,
        has_onboarded: true,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Fetch profile ─────────────────────────────────────────────────────────────

export async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()

  if (error) return null
  return data
}
