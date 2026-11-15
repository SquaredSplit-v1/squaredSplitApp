/**
 * Firebase Phone Authentication — replaces Twilio/MSG91 SMS delivery.
 *
 * Flow: Firebase sends + verifies the SMS code, then the resulting ID token
 * is exchanged with Supabase via signInWithIdToken({ provider: 'firebase' }).
 * Supabase matches the phone-number claim against the existing user (or
 * creates a new one + profile via handle_new_user), so all backend wiring
 * (profiles, expenses, groups, push) works unchanged.
 *
 * Requires (docs/firebase-phone-auth-setup.md):
 *   - google-services.json / GoogleService-Info.plist from the Firebase console
 *   - Phone sign-in enabled in Firebase Authentication
 *   - Supabase third-party Firebase auth enabled with the project id
 *   - EXPO_PUBLIC_USE_FIREBASE_AUTH=true in the environment
 */
import {
  getAuth,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from '@react-native-firebase/auth'
import { Platform } from 'react-native'

import { supabase } from './supabase/client'

export const firebaseAuthEnabled =
  process.env.EXPO_PUBLIC_USE_FIREBASE_AUTH === 'true' && Platform.OS !== 'web'

/** The pending Firebase phone-verification handle (module-scoped). */
let confirmation: ConfirmationResult | null = null

export interface PhoneAuthResult {
  success: boolean
  error?: string
}

/** Normalize to E.164-ish with a default country code when missing. */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('91') && digits.length === 12) return `+${digits}`
  if (digits.length === 10) return `+91${digits}` // India default picker
  return `+${digits}`
}

/** Send the Firebase SMS code. Resolves once the code has been dispatched. */
export async function startPhoneVerification(rawPhone: string): Promise<PhoneAuthResult> {
  if (!firebaseAuthEnabled) return { success: false, error: 'Firebase auth is not enabled.' }
  try {
    confirmation = await signInWithPhoneNumber(getAuth(), toE164(rawPhone))
    return { success: true }
  } catch (e) {
    return { success: false, error: firebaseError(e) }
  }
}

/** Confirm the code, exchange the Firebase token for a Supabase session. */
export async function confirmPhoneCode(code: string): Promise<PhoneAuthResult> {
  if (!confirmation) return { success: false, error: 'No verification in progress.' }
  try {
    const creds = await confirmation.confirm(code)
    confirmation = null

    const idToken = await getAuth().currentUser?.getIdToken()
    if (!idToken) return { success: false, error: 'Could not read the Firebase token.' }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'firebase',
      token: idToken,
    })
    if (error) return { success: false, error: supabaseError(error.message) }

    void creds
    return { success: true }
  } catch (e) {
    return { success: false, error: firebaseError(e) }
  }
}

function firebaseError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e)
  if (msg.includes('invalid-phone-number')) return 'That phone number is not valid.'
  if (msg.includes('too-many-requests') || msg.includes('quota'))
    return 'Too many attempts. Try again in a few minutes.'
  if (msg.includes('app-not-authorized') || msg.includes('API key') || msg.includes('api-key'))
    return 'Phone sign-in is not configured yet. Contact support.'
  if (msg.includes('invalid-verification-code')) return 'That code is not valid.'
  if (msg.includes('session-expired')) return 'The code expired. Send a new one.'
  return 'Could not send/verify the code right now. Please try again.'
}

function supabaseError(message: string): string {
  if (message.toLowerCase().includes('provider')) {
    return 'Server-side Firebase sign-in is not enabled yet.'
  }
  return 'Sign-in failed. Please try again.'
}
