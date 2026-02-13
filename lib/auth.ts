/**
 * Auth API helper — routes all phone OTP requests through the Supabase Edge Function
 * (`phone-auth`) which enforces rate limiting, E.164 normalization, and verify-attempt lockout.
 *
 * The edge function URLs come from `EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL` in `.env.*`.
 */

import { supabase } from "./supabase";

const PHONE_AUTH_URL = process.env.EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

if (!PHONE_AUTH_URL) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL — check your .env file.",
  );
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SendOtpResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
  isNewUser?: boolean;
}

// ─── Send OTP ──────────────────────────────────────────────────────────────

/**
 * Sends a one-time password to a phone number via the edge function.
 * Always returns a generic `{ success: true }` from the backend to avoid
 * leaking whether a phone number is registered.
 */
export async function sendOtp(phone: string): Promise<SendOtpResult> {
  try {
    const res = await fetch(`${PHONE_AUTH_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error ?? "Failed to send verification code.",
        retryAfter: data.retryAfter,
      };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ─── Verify OTP ────────────────────────────────────────────────────────────

/**
 * Verifies the OTP code through the edge function and, on success,
 * hydrates the local Supabase client session so `onAuthStateChange`
 * fires automatically.
 *
 * Returns `isNewUser: true` when the user was just created (i.e. first sign-up)
 * so the caller can redirect to onboarding.
 */
export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<VerifyOtpResult> {
  try {
    const res = await fetch(`${PHONE_AUTH_URL}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ phone, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.error ?? "Verification failed.",
        retryAfter: data.retryAfter,
      };
    }

    // Hydrate the local Supabase client with the session returned by the edge
    // function. This makes `supabase.auth.getSession()` and the
    // `onAuthStateChange` listener pick up the authenticated state immediately.
    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    // Determine if this is a brand-new user (first-time sign-up)
    const isNewUser = !!data.user?.created_at && isRecentTimestamp(data.user.created_at);

    return { success: true, isNewUser };
  } catch {
    return { success: false, error: "Network error. Please try again." };
  }
}

// ─── Resend OTP ────────────────────────────────────────────────────────────

/**
 * Convenience wrapper — semantically identical to `sendOtp` but named for
 * clarity at the call-site (verify-otp screen "Resend" button).
 */
export const resendOtp = sendOtp;

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Returns true when the ISO timestamp is less than 10 seconds old. */
function isRecentTimestamp(iso: string): boolean {
  const created = new Date(iso).getTime();
  return Date.now() - created < 10_000;
}
