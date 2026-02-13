type AppEnvironment = "development" | "staging" | "production";

export function getAppEnv(): AppEnvironment {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  if (env === "staging" || env === "production") return env;
  return "development";
}

export function isDev(): boolean {
  return getAppEnv() === "development";
}

export function isStaging(): boolean {
  return getAppEnv() === "staging";
}

export function isProduction(): boolean {
  return getAppEnv() === "production";
}