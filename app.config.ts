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
    supabaseUrl: 'https://eqqcqnfnfnzurfjfzwwp.supabase.co',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    phoneAuthUrl: 'https://eqqcqnfnfnzurfjfzwwp.supabase.co/functions/v1/phone-auth',
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

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: env.name,
  slug: 'squaredSplitApp',
  version: '1.0.0',
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
    infoPlist: {
      NSPhotoLibraryUsageDescription:
        'SquaredSplit needs access to your photo library to set a profile picture.',
      NSCameraUsageDescription:
        'SquaredSplit needs access to your camera to take a profile picture.',
    },
  },
  android: {
    package: env.androidPackage,
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
  runtimeVersion: {
    policy: 'appVersion',
  },
  plugins: [
    'expo-router',
    'expo-contacts',
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
  ],
  experiments: {
    typedRoutes: true,
  },
})
