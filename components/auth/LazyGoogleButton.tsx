/**
 * Google sign-in button that lazily loads expo-auth-session/providers/google.
 * The auth-request hook lives in a runner component that only mounts once the
 * module is imported — so the login screen has no static dependency on
 * expo-auth-session / expo-crypto and app boot can never crash on them.
 * Rendered only when Google client IDs are configured (canUseGoogle()).
 */
import React, { useEffect, useState } from 'react'

import { GoogleButton } from '@/components/auth/SocialButtons'
import {
  loadGoogleModule,
  type GoogleProviderModule,
  type SocialAuthOutcome,
} from '@/lib/socialAuth'
import { GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@/lib/socialAuthEnv'
import { supabase } from '@/lib/supabase/client'

function friendlyGoogleError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '')
  if (message.includes('Cannot find native module')) {
    return 'Google sign-in is unavailable in this build.'
  }
  return 'Sign in failed. Please try again.'
}

/** Inner runner: mounts only after the provider module loaded, so the hook is legal. */
function GoogleRunner({
  Google,
  onOutcome,
  onBusyChange,
  onPromptReady,
}: {
  Google: GoogleProviderModule
  onOutcome: (o: SocialAuthOutcome) => void
  onBusyChange: (busy: boolean) => void
  onPromptReady: (prompt: () => void) => void
}) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  })

  useEffect(() => {
    if (request) onPromptReady(() => void promptAsync())
  }, [request, promptAsync, onPromptReady])

  useEffect(() => {
    if (!response) return
    if (response.type === 'error') {
      onOutcome({ success: false, error: friendlyGoogleError(response.error) })
      return
    }
    if (response.type !== 'success') {
      onBusyChange(false)
      return
    }

    const idToken = (response.params as Record<string, string | undefined> | undefined)?.id_token
    if (!idToken) {
      onOutcome({
        success: false,
        error: 'Google did not return a sign-in token. Please try again.',
      })
      return
    }

    let cancelled = false
    onBusyChange(true)
    supabase.auth
      .signInWithIdToken({ provider: 'google', token: idToken })
      .then(({ error }) => {
        if (cancelled) return
        if (error) onOutcome({ success: false, error: friendlyGoogleError(error.message) })
        else onOutcome({ success: true })
      })
      .catch(err => {
        if (!cancelled) onOutcome({ success: false, error: friendlyGoogleError(err) })
      })
      .finally(() => {
        if (!cancelled) onBusyChange(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response])

  return null
}

export default function LazyGoogleButton({
  onOutcome,
}: {
  onOutcome: (o: SocialAuthOutcome) => void
}) {
  const [mod, setMod] = useState<GoogleProviderModule | null>(null)
  const [busy, setBusy] = useState(false)
  const [prompt, setPrompt] = useState<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false
    loadGoogleModule()
      .then(Google => {
        if (!cancelled) setMod(Google)
      })
      .catch(() => {
        // Module unavailable (stale binary) — button stays disabled.
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      {mod ? (
        <GoogleRunner
          Google={mod}
          onOutcome={onOutcome}
          onBusyChange={setBusy}
          onPromptReady={setPrompt}
        />
      ) : null}
      <GoogleButton onPress={() => prompt?.()} busy={busy} disabled={busy || !prompt} />
    </>
  )
}
