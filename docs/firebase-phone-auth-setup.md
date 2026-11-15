# Firebase Phone Auth — replacing Twilio/MSG91 SMS

Phone sign-in now uses **Firebase Phone Authentication**: Firebase sends and
verifies the SMS code, then the app exchanges the Firebase ID token with
Supabase (`signInWithIdToken({ provider: 'firebase' })`). Profiles, expenses,
groups and push keep working unchanged — Supabase matches the phone-number
claim and signs into the existing user.

Gated by `EXPO_PUBLIC_USE_FIREBASE_AUTH=true` (dev + staging have it on).
Legacy Supabase OTP remains as fallback when the flag is off.

## Console setup — one time (~10 min, works immediately after)

1. **Firebase console** → <https://console.firebase.google.com> → create a
   project (e.g. `squaredsplit`).
2. **Build → Authentication → Get started → Phone** → enable.
3. **Authentication → Settings → Phone numbers for testing** — add the QA
   numbers so testers don't consume the SMS quota:
   - `+919000000001 … +919000000007` → code `123456`
   - `+14155550101 … +14155550107` → code `123456`
   - (also the 3 production test numbers if desired)
4. **Project settings (gear) → Your apps**:
   - **Add app → Android** — package `com.squaredsplit.app.dev`
     → download `google-services.json` → drop it in the **project root** of
     this repo (replaces the placeholder).
   - Add app → Android again → package `com.squaredsplit.app`
     (production) — download the second `google-services.json`.
     NOTE: two android apps → the root file can only hold one. Use the
     **dev** one for dev builds; for production EAS builds, set
     `EXPO_PUBLIC_GOOGLE_SERVICES_JSON` / supply the prod file via a
     separate path (see "Two bundle IDs" below).
   - **Add app → iOS** — bundle `com.squaredsplit.app` → download
     `GoogleService-Info.plist` → project root (replaces placeholder).
5. **Add the SHA-256 fingerprints** of the EAS keystore to each Android app
   (Project settings → Your apps → Add fingerprint). Get them from the EAS
   dashboard → project → Credentials → Android → Keystore (SHA-256 shown).
   Without them, sign-in falls back to a reCAPTCHA challenge (works, but
   adds friction). Debug builds additionally register the debug keystore
   fingerprint if you build locally.
6. **Supabase side** — enable Firebase third-party auth per project
   (dashboard: Authentication → Sign In / Up → allow Firebase, set the
   Firebase project id; or PATCH config/auth `third_party_auth`). The
   Firebase project id is the `project_id` inside the downloaded
   google-services.json.

## Two bundle IDs (dev vs production)

Both `com.squaredsplit.app.dev` (QA) and `com.squaredsplit.app` (store)
must exist in the same Firebase project. The root `google-services.json`
holds ONE android client — for dev builds keep the `.dev` entry; before a
production build, replace it with the prod entry (or use the
multi-client layout the console offers when you register both apps under
one package family). Simplest repeatable flow: keep two files in
`~/Downloads` and swap the root copy before each EAS build.

## What was removed

- The Supabase `signInWithOtp`/`verifyOtp` path and the `send-sms`
  MSG91 hook are no longer used at runtime when the flag is on (the
  function stays deployed harmlessly).
- Twilio config can be cleared per project (Auth → Providers → Phone).
