import { useEffect } from 'react'

import { captureException } from '@/lib/sentry'

/**
 * Registers two global error handlers:
 * 1. ErrorUtils — catches all unhandled JS exceptions and fatal crashes
 * 2. Promise rejection tracking — catches unhandled promise rejections
 *
 * Must be called once at the root layout level.
 */
export function useGlobalErrorHandler(): void {
  useEffect(() => {
    // ── 1. JS runtime errors + fatal native bridge errors ──────────────────
    const prevHandler = ErrorUtils.getGlobalHandler()

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      captureException(error, {
        tags: { isFatal: String(!!isFatal) },
      })
      prevHandler(error, isFatal)
    })

    // ── 2. Unhandled promise rejections ────────────────────────────────────
    const rejectionTracking = require('promise/setimmediate/rejection-tracking')
    rejectionTracking.enable({
      allRejections: true,
      onUnhandled: (_id: number, error: unknown) => {
        captureException(error, { tags: { source: 'unhandledPromiseRejection' } })
        if (__DEV__) console.error('[unhandledRejection]', error)
      },
      onHandled: () => {},
    })

    return () => {
      ErrorUtils.setGlobalHandler(prevHandler)
      rejectionTracking.disable()
    }
  }, [])
}
