import * as Sentry from '@sentry/react-native'

interface ErrorUtils {
  getGlobalHandler: () => (error: Error, isFatal: boolean) => void
  setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void
}

declare const global: typeof globalThis & { ErrorUtils?: ErrorUtils }

export function initSentry() {
  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      environment: process.env.APP_ENV ?? 'development',
      enabled: !__DEV__,
      tracesSampleRate: __DEV__ ? 0 : 0.2,
      profilesSampleRate: __DEV__ ? 0 : 0.1,
      attachStacktrace: true,
      integrations: [
        Sentry.mobileReplayIntegration({
          maskAllText: true,
          maskAllImages: true,
        }),
      ],
      _experiments: {
        profilesSampleRate: __DEV__ ? 0 : 0.1,
      },
    })

    const originalHandler = global.ErrorUtils?.getGlobalHandler()
    global.ErrorUtils?.setGlobalHandler((error: Error, isFatal: boolean) => {
      Sentry.captureException(error, { extra: { isFatal } })
      originalHandler?.(error, isFatal)
    })
  } catch (e) {
    console.warn('[Sentry] init failed — native module likely missing in dev client:', e)
  }
}

export const captureError = Sentry.captureException
export const captureMessage = Sentry.captureMessage
