import { useAuthStore } from '@/store/authStore'

import { supabase } from './supabase/client'

const PHONE_AUTH_URL = process.env.EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL!

export interface SendOtpResult {
  success: boolean
  error?: string
  retryAfter?: number
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  isNewUser?: boolean
  retryAfter?: number
}

// ─── Send OTP ──────────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    console.log('📞 sendOtp URL:', PHONE_AUTH_URL)
    console.log('📞 sendOtp phone:', phone)

    const res = await fetch(`${PHONE_AUTH_URL}/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    })

    const data = await res.json()

    if (res.status === 429) {
      return {
        success: false,
        error: `Too many attempts. Try again in ${data.retryAfter}s.`,
        retryAfter: data.retryAfter,
      }
    }

    if (!res.ok) {
      return { success: false, error: data.error ?? 'Failed to send code.' }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Verify OTP ────────────────────────────────────────────────────────────

export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  try {
    const res = await fetch(`${PHONE_AUTH_URL}/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    })

    const data = await res.json()
    console.log('✅ verifyOtp response status:', res.status)
    console.log('✅ verifyOtp response data:', JSON.stringify(data))

    if (res.status === 429) {
      return {
        success: false,
        error: `Too many attempts. Try again in ${data.retryAfter}s.`,
        retryAfter: data.retryAfter,
      }
    }

    if (!res.ok) {
      return { success: false, error: data.error ?? 'Invalid or expired OTP.' }
    }

    if (data.session && data.user) {
      console.log('✅ calling setSession with tokens')
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
      console.log('✅ setSession error:', sessionError ?? 'none')

      // Directly hydrate the store — bypasses onAuthStateChange listener bug
      // with custom storage adapters (LargeSecureStore)
      if (!sessionError) {
        await useAuthStore.getState().hydrateSession(data.session, data.user)
      }
    } else {
      console.log('❌ data.session or data.user is null')
    }

    const isNewUser = !!data.user?.created_at && isRecentTimestamp(data.user.created_at)
    return { success: true, isNewUser }
  } catch (e) {
    console.log('❌ verifyOtp caught error:', e)
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Resend OTP ────────────────────────────────────────────────────────────

export const resendOtp = sendOtp

// ─── Helpers ───────────────────────────────────────────────────────────────

function isRecentTimestamp(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 10_000
}
