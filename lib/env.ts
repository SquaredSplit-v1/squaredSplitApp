type AppEnvironment = 'development' | 'staging' | 'production'

export function getAppEnv(): AppEnvironment {
  const env = process.env.EXPO_PUBLIC_APP_ENV
  if (env === 'staging' || env === 'production') return env
  return 'development'
}

export function isDev(): boolean {
  return getAppEnv() === 'development'
}

export function isStaging(): boolean {
  return getAppEnv() === 'staging'
}

export function isProduction(): boolean {
  return getAppEnv() === 'production'
}

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
export const PHONE_AUTH_URL = process.env.EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL!
