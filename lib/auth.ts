import { SUPABASE_ANON_KEY, PHONE_AUTH_URL } from '@/lib/env'

import { supabase } from './supabase/client'

const SUPABASE_HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  apikey: SUPABASE_ANON_KEY,
}

export interface SendOtpResult {
  success: boolean
  error?: string
  retryAfter?: number
}

export interface VerifyOtpResult {
  success: boolean
  error?: string
  retryAfter?: number
}

// ─── Send OTP ──────────────────────────────────────────────────────────────

export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    const res = await fetch(`${PHONE_AUTH_URL}/send-otp`, {
      method: 'POST',
      headers: SUPABASE_HEADERS,
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
      headers: SUPABASE_HEADERS,
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
    if (!data.session?.access_token || !data.session?.refresh_token) {
      return { success: false, error: 'Invalid response from server.' }
    }

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    })

    if (sessionError) {
      return { success: false, error: 'Failed to establish session. Please try again.' }
    }

    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

// ─── Resend OTP ────────────────────────────────────────────────────────────

export const resendOtp = sendOtp

// ─── Email + password credentials ──────────────────────────────────────────

export interface EmailAuthResult {
  success: boolean
  error?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/**
 * Sign in an existing email+password account. With autoconfirm enabled
 * (no SMTP configured) sign-ups are session-confirmed immediately.
 */
export async function signInWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        return {
          success: false,
          error: 'Wrong email or password. New here? Create an account below.',
        }
      }
      return { success: false, error: friendlyAuthError(error.message) }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/** Create an email+password account; the user is signed in immediately. */
export async function signUpWithEmail(email: string, password: string): Promise<EmailAuthResult> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })
    if (error) return { success: false, error: friendlyAuthError(error.message) }
    // Without SMTP, autoconfirm means a session comes back straight away.
    if (!data.session) {
      return {
        success: false,
        error: 'Check your inbox to confirm this email, then sign in.',
      }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Network error. Please try again.' }
  }
}

/**
 * True when the user owns an email+password credential (vs phone/social only).
 * Used to label "Set password" vs "Change password" in Account.
 */
export function hasEmailIdentity(
  user: { identities?: { provider: string }[] | null } | null
): boolean {
  return Boolean(user?.identities?.some(identity => identity.provider === 'email'))
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('already registered') || m.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.'
  }
  if (m.includes('password should be')) {
    return 'Password must be at least 6 characters.'
  }
  if (m.includes('unable to validate email')) {
    return 'That email address does not look right.'
  }
  if (m.includes('rate limit') || m.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Something went wrong. Please try again.'
}

/** Change (or set) the account email. Requires a signed-in session. */
export async function updateEmailAddress(newEmail: string): Promise<EmailAuthResult> {
  try {
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() })
    if (error) return { success: false, error: friendlyAuthError(error.message) }
    // Keep the profiles row in sync (trigger only runs on user creation).
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      await supabase
        .from('profiles')
        .update({ email: newEmail.trim(), updated_at: new Date().toISOString() })
        .eq('id', userData.user.id)
    }
    return { success: true }
  } catch {
    return { success: false, error: 'Could not update email. Please try again.' }
  }
}

/** Set or change the account password. Requires a signed-in session. */
export async function updatePassword(newPassword: string): Promise<EmailAuthResult> {
  try {
    if (newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' }
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) return { success: false, error: friendlyAuthError(error.message) }
    return { success: true }
  } catch {
    return { success: false, error: 'Could not update password. Please try again.' }
  }
}
