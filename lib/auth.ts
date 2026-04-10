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

    // Hydrate the Supabase session from the tokens returned by the edge function
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      })
    }

    const isNewUser = !!data.user?.created_at && isRecentTimestamp(data.user.created_at)
    return { success: true, isNewUser }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Resend OTP ────────────────────────────────────────────────────────────
export const resendOtp = sendOtp

// ─── Helpers ───────────────────────────────────────────────────────────────
function isRecentTimestamp(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < 10_000
}
