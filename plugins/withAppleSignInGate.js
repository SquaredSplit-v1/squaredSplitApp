/**
 * Sign in with Apple gate.
 *
 * expo-apple-authentication's config plugin always adds the
 * com.apple.developer.applesignin entitlement. That entitlement requires the
 * capability to be enabled on the App ID in the Apple Developer portal —
 * until that one-time toggle is done, App Store builds fail provisioning.
 *
 * This plugin removes the entitlement unless EXPO_PUBLIC_APPLE_LOGIN_ENABLED=true,
 * keeping the app buildable either way. lib/socialAuth.ts hides the Apple
 * button with the same variable.
 */
const { withEntitlementsPlist } = require('expo/config-plugins')

module.exports = function withAppleSignInGate(config) {
  return withEntitlementsPlist(config, config => {
    const enabled = process.env.EXPO_PUBLIC_APPLE_LOGIN_ENABLED === 'true'
    if (!enabled && config.modResults['com.apple.developer.applesignin'] !== undefined) {
      delete config.modResults['com.apple.developer.applesignin']
    }
    return config
  })
}
