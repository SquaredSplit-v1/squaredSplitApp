import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from './socialAuthEnv'
import { supabase } from './supabase/client'

// OAuth client IDs from Google Cloud Console (see docs/social-login-setup.md).
// When a platform has no client ID configured, its button is hidden.
export { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from './socialAuthEnv'

// Apple sign-in also requires the App ID capability in the Apple Developer
// portal; the entitlement is gated by plugins/withAppleSignInGate.js.
const APPLE_LOGIN_ENABLED = process.env.EXPO_PUBLIC_APPLE_LOGIN_ENABLED === 'true'

export interface SocialAuthOutcome {
  success: boolean
  error?: string
}

type OutcomeHandler = (outcome: SocialAuthOutcome) => void

/** Maps Supabase auth errors to text a first-time user can act on. */
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Sign in with your email instead.'
  }
  if (message.includes('Invalid') || message.includes('invalid')) {
    return 'Sign-in could not be verified. Please try again.'
  }
  if (message.includes('provider is not enabled') || message.includes('SMTP')) {
    return 'Social sign-in is not configured on the server yet.'
  }
  if (message.includes('Cannot find native module')) {
    return 'This sign-in method needs an app update. Please update the app.'
  }
  return 'Sign in failed. Please try again.'
}

// ─── Lazy native-module loading ──────────────────────────────────────────────
// expo-crypto / expo-apple-authentication / expo-auth-session all pull native
// modules. They are imported DYNAMICALLY and only when a social button is
// actually offered, so the login screen (and app boot) never touches them —
// email and phone login work even if these modules are missing entirely.

export type AppleAuthModule = typeof import('expo-apple-authentication')
export type CryptoModule = typeof import('expo-crypto')
export type GoogleProviderModule = typeof import('expo-auth-session/providers/google')

let appleModulePromise: Promise<AppleAuthModule> | null = null
let cryptoModulePromise: Promise<CryptoModule> | null = null
let googleModulePromise: Promise<GoogleProviderModule> | null = null

export function loadAppleModule(): Promise<AppleAuthModule> {
  appleModulePromise ??= import('expo-apple-authentication')
  return appleModulePromise
}

export function loadCryptoModule(): Promise<CryptoModule> {
  cryptoModulePromise ??= import('expo-crypto')
  return cryptoModulePromise
}

export function loadGoogleModule(): Promise<GoogleProviderModule> {
  googleModulePromise ??= import('expo-auth-session/providers/google')
  return googleModulePromise
}

export function canUseGoogle(): boolean {
  return Boolean(Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID)
}

export function isAppleLoginEnabled(): boolean {
  return APPLE_LOGIN_ENABLED && Platform.OS === 'ios'
}

// ─── Apple (native Sign in with Apple) ───────────────────────────────────────

/**
 * True when native Sign in with Apple can be offered: enabled by env var and
 * the native module loads on this device. The import is lazy, so a missing
 * native module only keeps the button hidden — it can never crash boot.
 */
export function useAppleAvailability(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    if (!isAppleLoginEnabled()) return
    let cancelled = false
    loadAppleModule()
      .then(Apple => Apple.isAvailableAsync())
      .then(isAvailable => {
        if (!cancelled) setAvailable(isAvailable)
      })
      .catch(() => {
        // Native module missing or errored — button stays hidden.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return available
}

/**
 * Native Sign in with Apple with a nonce so Supabase can verify the identity
 * token was minted for this sign-in request.
 */
export async function signInWithApple(onOutcome: OutcomeHandler): Promise<void> {
  if (!isAppleLoginEnabled()) {
    onOutcome({ success: false, error: 'Sign in with Apple is not available.' })
    return
  }

  let Apple: AppleAuthModule
  let Crypto: CryptoModule
  try {
    ;[Apple, Crypto] = await Promise.all([loadAppleModule(), loadCryptoModule()])
  } catch {
    onOutcome({ success: false, error: friendlyError(new Error('Cannot find native module')) })
    return
  }

  try {
    const available = await Apple.isAvailableAsync()
    if (!available) {
      onOutcome({ success: false, error: 'Sign in with Apple is not available on this device.' })
      return
    }

    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    )

    const credential = await Apple.signInAsync({
      requestedScopes: [
        Apple.AppleAuthenticationScope.FULL_NAME,
        Apple.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    })

    if (!credential.identityToken) {
      onOutcome({
        success: false,
        error: 'Apple did not return a sign-in token. Please try again.',
      })
      return
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    })

    if (error) {
      onOutcome({ success: false, error: friendlyError(error.message) })
      return
    }

    // Apple only shares the user's name on the very first authorization and it
    // is not part of the identity token — persist it to user metadata so the
    // profile setup screen can prefill it.
    const fullName = credential.fullName
    const name = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ').trim()
    if (name) {
      void supabase.auth.updateUser({ data: { full_name: name } }).catch(() => undefined)
    }

    onOutcome({ success: true })
  } catch (err) {
    // The user tapping "Cancel" in the Apple sheet is not an error worth showing.
    const code = (err as { code?: string })?.code
    if (code === 'ERR_REQUEST_CANCELED') return
    onOutcome({ success: false, error: friendlyError(err) })
  }
}
