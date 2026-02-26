import { ConfigContext, ExpoConfig } from "expo/config";

// Determine environment from APP_ENV or default to development
const APP_ENV = process.env.APP_ENV ?? "development";

const envConfig = {
  development: {
    name: "SquaredSplit (Dev)",
    slug: "squaredSplitApp",
    scheme: "squaredsplitapp.dev",
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.sqsplit.squaredSplitApp.dev",
    package: "com.sqsplit.squaredSplitApp.dev",
    eas: {
      projectId: "d74c8f5a-fa0d-4949-b5b6-b36310280603",
    },
  },
  staging: {
    name: "SquaredSplit (Staging)",
    slug: "squaredSplitApp",
    scheme: "squaredsplitapp.staging",
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.sqsplit.squaredSplitApp.staging",
    package: "com.sqsplit.squaredSplitApp.staging",
    eas: {
      projectId: "d74c8f5a-fa0d-4949-b5b6-b36310280603",
    },
  },
  production: {
    name: "SquaredSplit",
    slug: "squaredSplitApp",
    scheme: "squaredsplitapp",
    icon: "./assets/images/icon.png",
    bundleIdentifier: "com.sqsplit.squaredSplitApp",
    package: "com.sqsplit.squaredSplitApp",
    eas: {
      projectId: "d74c8f5a-fa0d-4949-b5b6-b36310280603",
    },
  },
} as const;

const currentEnv =
  envConfig[APP_ENV as keyof typeof envConfig] ?? envConfig.development;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: currentEnv.name,
  slug: currentEnv.slug,
  version: "1.0.0",
  orientation: "portrait",
  icon: currentEnv.icon,
  scheme: currentEnv.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: currentEnv.bundleIdentifier,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: currentEnv.package,
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  updates: {
    url: "https://u.expo.dev/d74c8f5a-fa0d-4949-b5b6-b36310280603"
  },
  runtimeVersion: {
    policy: "appVersion"
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {},
    eas: currentEnv.eas,
    APP_ENV,
  },
  owner: "sqsplit",
});
