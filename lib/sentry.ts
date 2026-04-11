import * as Sentry from '@sentry/react-native'

// ErrorUtils is a React Native runtime global — not in TypeScript's globalThis types
interface ErrorUtils {
  getGlobalHandler: () => (error: Error, isFatal: boolean) => void
  setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void
}

declare const global: typeof globalThis & { ErrorUtils?: ErrorUtils }

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
    environment: process.env.APP_ENV ?? 'development',
    enabled: !__DEV__,
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    attachStacktrace: true,
    integrations: [
      Sentry.mobileReplayIntegration({
        maskAllText: true,
        maskAllImages: true,
      }),
    ],
    _experiments: {
      profilesSampleRate: 0.1,
    },
  })

  const originalHandler = global.ErrorUtils?.getGlobalHandler()
  global.ErrorUtils?.setGlobalHandler((error: Error, isFatal: boolean) => {
    Sentry.captureException(error, { extra: { isFatal } })
    originalHandler?.(error, isFatal)
  })
}

export const captureError = Sentry.captureException
export const captureMessage = Sentry.captureMessage
