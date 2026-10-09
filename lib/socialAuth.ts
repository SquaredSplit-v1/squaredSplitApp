import * as AppleAuthentication from 'expo-apple-authentication'
import * as Google from 'expo-auth-session/providers/google'
import * as Crypto from 'expo-crypto'
import { useEffect, useState } from 'react'
import { Platform } from 'react-native'

import { supabase } from './supabase/client'

// OAuth client IDs from Google Cloud Console (see docs/social-login-setup.md).
// When a platform has no client ID configured, its button is hidden.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

export interface SocialAuthOutcome {
  success: boolean
  error?: string
}

type OutcomeHandler = (outcome: SocialAuthOutcome) => void

/** Maps Supabase auth errors to text a first-time user can act on. */
function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (message.includes('already registered') || message.includes('already been registered')) {
    return 'An account with this email already exists. Sign in with your phone number instead.'
  }
  if (message.includes('Invalid') || message.includes('invalid')) {
    return 'Sign-in could not be verified. Please try again.'
  }
  if (message.includes('provider is not enabled') || message.includes('SMTP')) {
    return 'Social sign-in is not configured on the server yet.'
  }
  return 'Sign in failed. Please try again.'
}

// ─── Google (ID-token flow) ──────────────────────────────────────────────────

/**
 * Google sign-in via expo-auth-session. The hook exchanges the returned ID
 * token for a Supabase session; navigation happens through the existing
 * onAuthStateChange listener in authStore.
 */
export function useGoogleSignIn(onOutcome: OutcomeHandler) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  })

  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (!response) return

    if (response.type === 'error') {
      onOutcome({ success: false, error: friendlyError(response.error) })
      return
    }
    if (response.type !== 'success') {
      setIsSigningIn(false)
      return
    }

    const idToken = response.params?.id_token
    if (!idToken) {
      onOutcome({
        success: false,
        error: 'Google did not return a sign-in token. Please try again.',
      })
      return
    }

    let cancelled = false
    setIsSigningIn(true)

    supabase.auth
      .signInWithIdToken({ provider: 'google', token: idToken })
      .then(({ error }) => {
        if (cancelled) return
        if (error) onOutcome({ success: false, error: friendlyError(error.message) })
        else onOutcome({ success: true })
      })
      .catch(err => {
        if (!cancelled) onOutcome({ success: false, error: friendlyError(err) })
      })
      .finally(() => {
        if (!cancelled) setIsSigningIn(false)
      })

    return () => {
      cancelled = true
    }
  }, [response, onOutcome])

  const canUseGoogle = Boolean(
    Platform.OS === 'ios' ? GOOGLE_IOS_CLIENT_ID : GOOGLE_ANDROID_CLIENT_ID
  )

  return {
    canUseGoogle,
    isSigningIn,
    // `promptAsync` is undefined until the request is built; guard at call sites too
    signInWithGoogle: () => void promptAsync(),
    googleRequestReady: Boolean(request),
  }
}

// ─── Apple (native Sign in with Apple) ───────────────────────────────────────

/**
 * Native Sign in with Apple (iOS only). Uses a nonce so Supabase can verify
 * the identity token was minted for this sign-in request.
 */
export async function signInWithApple(onOutcome: OutcomeHandler): Promise<void> {
  try {
    const available = await AppleAuthentication.isAvailableAsync()
    if (!available) {
      onOutcome({ success: false, error: 'Sign in with Apple is not available on this device.' })
      return
    }

    const rawNonce = Crypto.randomUUID()
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    )

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
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

/** True when native Sign in with Apple can be offered (iOS 13+ only). */
export function useAppleAvailability(): boolean {
  const [available, setAvailable] = useState(false)
  const disabled = process.env.EXPO_PUBLIC_APPLE_LOGIN_DISABLED === 'true'
  useEffect(() => {
    if (Platform.OS !== 'ios' || disabled) return
    let cancelled = false
    AppleAuthentication.isAvailableAsync().then(isAvailable => {
      if (!cancelled) setAvailable(isAvailable)
    })
    return () => {
      cancelled = true
    }
  }, [disabled])
  return available
}
