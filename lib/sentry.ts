/**
 * Sentry stub — mirrors @sentry/react-native public API.
 * enableNative requires a dev client rebuild (tracked: SS-015).
 * Swap this entire file for:
 *   export * from '@sentry/react-native'
 * after build:dev:ios completes.
 */

type SeverityLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug'

interface SentryUser {
  id: string
  phone?: string
  email?: string
}

interface Breadcrumb {
  category?: string
  message?: string
  level?: SeverityLevel
  data?: Record<string, unknown>
}

interface CaptureContext {
  tags?: Record<string, string>
  extra?: Record<string, unknown>
  level?: SeverityLevel
}

export const init = (_options: Record<string, unknown>): void => {
  if (__DEV__) console.log('[Sentry] stub init — native disabled until SS-015')
}

export const captureException = (error: unknown, ctx?: CaptureContext): void => {
  if (__DEV__) console.error('[Sentry] captureException:', error, ctx)
}

export const captureMessage = (message: string, level: SeverityLevel = 'info'): void => {
  if (__DEV__) console.log(`[Sentry] captureMessage [${level}]:`, message)
}

export const setUser = (user: SentryUser | null): void => {
  if (__DEV__) console.log('[Sentry] setUser:', user?.id ?? 'cleared')
}

export const addBreadcrumb = (breadcrumb: Breadcrumb): void => {
  if (__DEV__) console.log('[Sentry] breadcrumb:', breadcrumb.message)
}

// wrap() is a no-op — real Sentry uses it to add touch event instrumentation
export const wrap = <T>(component: T): T => component
