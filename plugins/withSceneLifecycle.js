/**
 * UIScene lifecycle adoption (required by the iOS 27 SDK): adds the
 * UIApplicationSceneManifest and converts the generated AppDelegate to
 * scene-based React startup. Idempotent.
 */
const { withInfoPlist, withAppDelegate, createRunOncePlugin } = require('expo/config-plugins')

const MANIFEST = {
  UIApplicationSceneManifest: {
    UIApplicationSupportsMultipleScenes: false,
    UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).ExpoAppSceneDelegate',
  },
}

const SCENE_CONFIG_METHOD = `
  // UIScene lifecycle (required by the iOS 27 SDK) — added by withSceneLifecycle
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let config = UISceneConfiguration(
      name: nil,
      sessionRole: connectingSceneSession.role
    )
    config.delegateClass = ExpoAppSceneDelegate.self
    return config
  }
`

const SCENE_DELEGATE_CLASS = `
// UIScene delegate — starts React Native for the window scene.
final class ExpoAppSceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene else { return }
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    reactNativeDelegate = delegate
    reactNativeFactory = factory

    let window = UIWindow(frame: windowScene.coordinateSpace.bounds)
    window.windowScene = windowScene
    self.window = window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil
    )
    window.makeKeyAndVisible()
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    (UIApplication.shared.delegate as? AppDelegate)?.application(
      UIApplication.shared,
      open: url,
      options: [:]
    )
  }
}
`

const withSceneLifecycle = (config) => {
  // 1. manifest
  config = withInfoPlist(config, (config) => {
    config.modResults = { ...MANIFEST, ...config.modResults }
    return config
  })

  // 2. AppDelegate: replace legacy window/startup with scene wiring
  config = withAppDelegate(config, (config) => {
    let src = config.modResults.contents

    // strip the legacy didFinishLaunching window + RN start (scene owns it now)
    src = src.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\n\s*#endif\n/,
      ''
    )

    if (!src.includes('ExpoAppSceneDelegate')) {
      // scene configuration method (ExpoAppDelegate has no override for it)
      src = src.replace(
        /(public override func application\(\s*_ app: UIApplication,\s*open url: URL,\s*options: \[UIApplication\.OpenURLOptionsKey: Any\] = nil\s*\) -> Bool \{\n[\s\S]*?return super\.application\([\s\S]*?\n\s*\}\n)/,
        '$1' + SCENE_CONFIG_METHOD
      )
      // scene delegate class at the end
      src = src + '\n' + SCENE_DELEGATE_CLASS
    }
    config.modResults.contents = src
    return config
  })

  return config
}

module.exports = createRunOncePlugin(withSceneLifecycle, 'withSceneLifecycle', '1.0.0')
