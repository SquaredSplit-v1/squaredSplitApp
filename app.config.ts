import type { ConfigContext, ExpoConfig } from 'expo/config'

const APP_ENV = process.env.APP_ENV ?? 'development'

const envConfig = {
  development: {
    name: 'SquaredSplit (Dev)',
    bundleIdentifier: 'com.squaredsplit.app.dev',
    androidPackage: 'com.squaredsplit.app.dev',
    supabaseUrl: 'https://bwkgphgnrrwczxkfeanz.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    phoneAuthUrl: 'https://bwkgphgnrrwczxkfeanz.supabase.co/functions/v1/phone-auth',
    icon: './assets/icon-dev.png',
  },
  preview: {
    name: 'SquaredSplit (Preview)',
    bundleIdentifier: 'com.squaredsplit.app.preview',
    androidPackage: 'com.squaredsplit.app.preview',
    supabaseUrl: 'https://tldohvypnuirpsvrrxoh.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    phoneAuthUrl: 'https://tldohvypnuirpsvrrxoh.supabase.co/functions/v1/phone-auth',
    icon: './assets/icon-preview.png',
  },
  // staging is an alias for preview env — same Supabase project, internal distribution
  staging: {
    name: 'SquaredSplit (Staging)',
    bundleIdentifier: 'com.squaredsplit.app.preview',
    androidPackage: 'com.squaredsplit.app.preview',
    supabaseUrl: 'https://tldohvypnuirpsvrrxoh.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    phoneAuthUrl: 'https://tldohvypnuirpsvrrxoh.supabase.co/functions/v1/phone-auth',
    icon: './assets/icon-preview.png',
  },
  production: {
    name: 'SquaredSplit',
    bundleIdentifier: 'com.squaredsplit.app',
    androidPackage: 'com.squaredsplit.app',
    supabaseUrl: 'https://clrnrpxxcpxhwsyseqyd.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    phoneAuthUrl: 'https://clrnrpxxcpxhwsyseqyd.supabase.co/functions/v1/phone-auth',
    icon: './assets/icon.png',
  },
} as const

type Env = keyof typeof envConfig
const env = envConfig[(APP_ENV as Env) ?? 'development']

// Google OAuth client IDs (see docs/social-login-setup.md). The reverse-DNS
// schemes derived from them are registered as URL schemes / intent filters so
// the browser-based Google prompt can hand the ID token back to the app.
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID

const googleIosScheme = GOOGLE_IOS_CLIENT_ID
  ? GOOGLE_IOS_CLIENT_ID.split('.').reverse().join('.')
  : null
const googleAndroidScheme = GOOGLE_ANDROID_CLIENT_ID
  ? GOOGLE_ANDROID_CLIENT_ID.split('.').reverse().join('.')
  : null

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env.name,
  slug: 'squaredSplitApp',
  scheme: 'squaredsplit',
  // v0.2.0 — v0.2–v0.3 feature wave (social+email auth, groups, account suite).
  // runtimeVersion uses sdkVersion so OTA updates only target compatible builds.
  version: '0.2.0',
  orientation: 'portrait',
  icon: env.icon,
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#F3F4F5',
  },
  ios: {
    bundleIdentifier: env.bundleIdentifier,
    supportsTablet: false,
    // Sign in with Apple is gated by plugins/withAppleSignInGate.js (the
    // expo-apple-authentication plugin adds the entitlement unconditionally;
    // it needs the App ID capability enabled in the Apple Developer portal
    // first). Enable via EXPO_PUBLIC_APPLE_LOGIN_ENABLED=true and rebuild.
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'SquaredSplit needs access to your photo library to set a profile picture.',
      NSCameraUsageDescription:
        'SquaredSplit needs access to your camera to take a profile picture.',
      NSContactsUsageDescription:
        'SquaredSplit needs access to your contacts so you can find friends who already use the app.',
      ITSAppUsesNonExemptEncryption: false,
      ...(googleIosScheme
        ? {
            CFBundleURLTypes: [
              // Deep-link scheme (also added automatically by `scheme` above)
              { CFBundleURLName: env.bundleIdentifier, CFBundleURLSchemes: ['squaredsplit'] },
              // Reversed Google iOS client ID — the redirect Google sends the
              // ID token back to after the browser sign-in prompt.
              { CFBundleURLName: googleIosScheme, CFBundleURLSchemes: [googleIosScheme] },
            ],
          }
        : {}),
    },
  },
  android: {
    package: env.androidPackage,
    permissions: ['android.permission.READ_CONTACTS', 'android.permission.POST_NOTIFICATIONS'],
    ...(googleAndroidScheme
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: false,
              data: [{ scheme: googleAndroidScheme }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#F3F4F5',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      projectId: 'd74c8f5a-fa0d-4949-b5b6-b36310280603',
    },
  },
  updates: {
    url: 'https://u.expo.dev/d74c8f5a-fa0d-4949-b5b6-b36310280603',
  },
  // sdkVersion policy: OTA update is only delivered to a build compiled
  // with the same Expo SDK version, preventing incompatible JS/native mismatch.
  runtimeVersion: {
    policy: 'sdkVersion',
  },
  plugins: [
    'expo-router',
    'expo-image-picker',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/splash.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#F3F4F5',
      },
    ],
    [
      'expo-contacts',
      {
        contactsPermission:
          'SquaredSplit needs access to your contacts so you can find friends who already use the app.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#141414',
      },
    ],
    './plugins/withAndroidReadContacts.js',
    './plugins/withAppleSignInGate.js',
  ],
  experiments: {
    typedRoutes: true,
  },
})
