/**
 * Forces READ_CONTACTS into AndroidManifest.xml during prebuild.
 * Declaring the permission in app.config is usually enough; this plugin is a
 * belt-and-braces hook so EAS/Gradle always sees the permission even if merge
 * order changes between Expo SDK releases.
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins')

const PERM = 'android.permission.READ_CONTACTS'

module.exports = function withAndroidReadContacts(config) {
  return withAndroidManifest(config, async cfg => {
    AndroidConfig.Permissions.ensurePermission(cfg.modResults, PERM)
    return cfg
  })
}
