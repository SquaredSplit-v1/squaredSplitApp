/**
 * Auth API helper — uses Supabase's native phone OTP methods directly.
 * Phone numbers must be in E.164 format (e.g. +919876543210).
 */

import { supabase } from './supabase'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SendOtpResult {
  success: boolean
  error?: string
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  isNewUser?: boolean
}

// ─── Send OTP ──────────────────────────────────────────────────────────────

/**
 * Send OTP to phone number.
 * Phone must be in E.164 format: +919876543210
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone: phone, // must be E.164 format: +919876543210
    })
    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Verify OTP ────────────────────────────────────────────────────────────

/**
 * Verify OTP user enters.
 * Session is hydrated automatically by `supabase.auth.verifyOtp`.
 */
export async function verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: otp,
      type: 'sms',
    })
    if (error) {
      return { success: false, error: error.message }
    }

    // Determine if this is a brand-new user (first-time sign-up)
    const isNewUser = !!data.user?.created_at && isRecentTimestamp(data.user.created_at)

    return { success: true, isNewUser }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Resend OTP ────────────────────────────────────────────────────────────

/**
 * Convenience wrapper — semantically identical to `sendOtp` but named for
 * clarity at the call-site (verify-otp screen "Resend" button).
 */
export const resendOtp = sendOtp

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns true when the ISO timestamp is less than 10 seconds old. */
function isRecentTimestamp(iso: string): boolean {
  const created = new Date(iso).getTime()
  return Date.now() - created < 10_000
}
