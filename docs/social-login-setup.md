# Social login setup (Google + Apple)

The app supports **Sign in with Google** and **Sign in with Apple** alongside phone-OTP login
(`app/(auth)/login.tsx` → `lib/socialAuth.ts`). Both use Supabase
`signInWithIdToken`, so the app exchanges a provider ID token for a Supabase session —
no OAuth secret ships with the app.

## Apple — already wired

- Client: native `expo-apple-authentication` with a SHA-256 nonce; button appears on iOS when available.
- Native: `com.apple.developer.applesignin` entitlement is declared in `app.config.ts`; EAS syncs the
  capability into the provisioning profile on the next build (`expo prebuild` picks it up locally too).
- Server: the Apple provider is enabled per Supabase project with `external_apple_client_id` set to
  that environment's bundle ID:

  | Supabase project | Bundle ID |
  | --- | --- |
  | dev (`bwkgphgnrrwczxkfeanz`) | `com.squaredsplit.app.dev` |
  | staging/preview (`eqqcqnfnfnzurfjfzwwp`) | `com.squaredsplit.app.preview` |
  | main (`clrnrpxxcpxhwsyseqyd`) | `com.squaredsplit.app` |

No Apple Developer portal work is needed beyond the paid team already in use.
(App Store policy: because the app offers Google login, Apple login **must** ship on iOS — it does.)

## Google — one-time console setup (user action)

1. **Google Cloud Console** → <https://console.cloud.google.com> → create (or reuse) a project,
   e.g. `squaredsplit`.
2. **APIs & Services → OAuth consent screen**: External, app name `SquaredSplit`, support + developer
   email, add your test users while in Testing mode (or publish for production).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** — create three clients:
   - **iOS**: bundle ID `com.squaredsplit.app` (also used by the `.dev`/`.preview` variants).
   - **Android**: package `com.squaredsplit.app`, plus the SHA-1 of every signing key that will run
     the app — local debug: `keytool -list -exportcert -alias androiddebugkey -keystore ~/.android/debug.keystore`;
     EAS builds: `eas credentials -p android` shows the keystore SHA-1. (Repeat per package variant if you
     build `com.squaredsplit.app.dev` for Android.)
   - **Web application**: no special config; its client ID + (optional) secret go into Supabase.
4. **Supabase dashboard → Authentication → Providers → Google**:
   - Client ID: the **Web** client ID (secret only needed for web OAuth, which we don't use).
   - **Authorized Client IDs**: paste the **iOS** and **Android** client IDs (comma-separated).
     This is what lets `signInWithIdToken` accept tokens minted for the app clients.
   - Do this per environment project (dev / staging / main).
5. **App env vars** — set in `.env.development` locally and in EAS environment variables
   (they must exist at *build* time so the reverse-client-ID URL schemes land in the native project):
   ```
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=    # iOS client
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID= # Android client
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=     # Web client
   ```
6. Rebuild the dev client (`npm run build:dev`) — URL schemes / intent filters are native config.
   Until the IDs are set, the Google button simply stays hidden.

## Behaviour notes

- Social sign-ins create a profile via the existing `handle_new_user` trigger (email set, phone null).
- Onboarding profile setup prefills name/avatar from the OAuth `user_metadata`
  (Google always provides both; Apple provides the name only on the very first authorization — the
  client persists it via `auth.updateUser`).
- Existing phone users are unaffected; if a social account's email matches an existing email user,
  Supabase links the identities automatically.
- Friends/contact matching is still phone-based; social-only users simply won't be discoverable via
  contacts until phone linking is added.
