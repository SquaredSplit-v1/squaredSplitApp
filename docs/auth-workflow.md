# Authentication Workflow — SquaredSplit

> **Last updated:** 2025-07

This document covers the complete phone-OTP authentication architecture, environment setup, session handling, and step-by-step guides for **developers**, **testers**, and **production** releases.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Setup](#environment-setup)
3. [Auth Flow (end-to-end)](#auth-flow-end-to-end)
4. [Session Handling](#session-handling)
5. [Developer Guide (local / dev)](#developer-guide)
6. [Tester Guide (staging)](#tester-guide)
7. [Production Notes](#production-notes)
8. [Edge Function Reference](#edge-function-reference)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌──────────────────┐       ┌──────────────────────────┐       ┌───────────────┐
│   React Native   │──────▶│  Supabase Edge Function   │──────▶│  Supabase Auth │
│   (Expo app)     │       │  (phone-auth)             │       │   + Twilio SMS │
│                  │◀──────│  /send-otp · /verify-otp  │◀──────│               │
└──────────────────┘       └──────────────────────────┘       └───────────────┘
```

### Key design decisions

| Decision                                          | Why                                                                                                                                                                                     |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All OTP requests go through the **edge function** | Rate limiting (per phone & per IP), E.164 normalization, verify-attempt lockout are enforced server-side. The app never calls `supabase.auth.signInWithOtp()` / `verifyOtp()` directly. |
| Session hydration via `setSession()`              | After the edge function returns access/refresh tokens, `lib/auth.ts` calls `supabase.auth.setSession()` so the local client is immediately authenticated and `onAuthStateChange` fires. |
| Onboarding flag in AsyncStorage                   | Per-user key (`@squaredsplit/onboarding_complete:<uid>`) avoids showing onboarding to returning users.                                                                                  |
| Three Supabase projects                           | `dev` (local), `staging` (remote), `production` (remote) — each tied to a GitHub branch.                                                                                                |

---

## Environment Setup

The app reads env variables from `.env.*` files loaded automatically by Expo:

| File              | Branch    | Supabase Instance                |
| ----------------- | --------- | -------------------------------- |
| `.env.dev`        | `dev`     | Local — `http://127.0.0.1:54321` |
| `.env.staging`    | `staging` | Remote staging project           |
| `.env.production` | `main`    | Remote production project        |

### Required variables

```dotenv
EXPO_PUBLIC_APP_ENV=development|staging|production
EXPO_PUBLIC_SUPABASE_URL=<supabase url>
EXPO_PUBLIC_SUPABASE_KEY=<supabase anon key>
EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL=<supabase url>/functions/v1/phone-auth
EXPO_PUBLIC_API_URL=<supabase url>
```

> **Action required for staging / production:**  
> Replace the placeholder values in `.env.staging` and `.env.production` with your actual Supabase project URLs and anon keys from the Supabase dashboard → Settings → API.

---

## Auth Flow (end-to-end)

```
App Launch
    │
    ▼
authloading.tsx ──── animated splash ────┐
    │                                     │
    ├── user session exists? ────────────▶ /dashboard/dashboard
    │
    └── no session ─────────────────────▶ /(auth)/login
                                              │
                                      user enters phone
                                              │
                                              ▼
                                  lib/auth.ts ─ sendOtp()
                                  ─▶ edge fn /send-otp
                                              │
                                              ▼
                                     /(auth)/verify-otp
                                              │
                                      user enters 6-digit code
                                              │
                                              ▼
                                  lib/auth.ts ─ verifyOtp()
                                  ─▶ edge fn /verify-otp
                                              │
                              ┌───────────────┼────────────────┐
                              │               │                │
                       new user?          existing user     error
                              │               │                │
                              ▼               ▼                ▼
                     /(auth)/onboarding   /dashboard      Alert shown
                              │
                      skip/done pressed
                      completeOnboarding()
                              │
                              ▼
                       /dashboard/dashboard
```

### Root layout auth gating

`app/_layout.tsx` contains a `RootNavigator` that watches `useAuth()`:

- **Not signed in + outside `(auth)` group** → redirect to `/dashboard/dashboard`
- **Signed in + inside `(auth)` group** → redirect to `/dashboard/dashboard`
  - Exception: stays on `/(auth)/onboarding` until `hasCompletedOnboarding` is true

This means deep links into dashboard screens are protected automatically.

---

## Session Handling

### How sessions are managed

| Concern              | Implementation                                                                                |
| -------------------- | --------------------------------------------------------------------------------------------- |
| **Persistence**      | `@react-native-async-storage/async-storage` configured in `lib/supabase.ts`                   |
| **Auto-refresh**     | `autoRefreshToken: true` — Supabase JS SDK refreshes tokens automatically before expiry       |
| **Hydration**        | On app start, `supabase.auth.getSession()` loads the persisted session                        |
| **Realtime updates** | `onAuthStateChange` in `AuthContext` listens for `SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED` |
| **Sign-out**         | Calls `supabase.auth.signOut()` which clears AsyncStorage and emits `SIGNED_OUT`              |

### Token lifecycle

1. `verifyOtp()` in `lib/auth.ts` receives `access_token` + `refresh_token` from the edge function.
2. Calls `supabase.auth.setSession(...)` — this persists tokens to AsyncStorage.
3. `onAuthStateChange` fires `SIGNED_IN` → `AuthContext` updates `user` / `session`.
4. Supabase JS SDK automatically refreshes the token when it's close to expiry.
5. On app re-open, `getSession()` loads the persisted tokens; if expired, the SDK refreshes them.

---

## Developer Guide

### Prerequisites

- Node 20+, pnpm / npm / yarn
- Expo CLI: `npx expo`
- Supabase CLI: `brew install supabase/tap/supabase`
- Docker Desktop (for local Supabase)

### 1. Start local Supabase

```bash
supabase start
```

This spins up Postgres, Auth, Storage, Edge Functions locally.  
The dashboard is at `http://127.0.0.1:54323`.

### 2. Serve the edge function

```bash
supabase functions serve phone-auth --no-verify-jwt
```

> `--no-verify-jwt` is fine for local dev since the local anon key is hard-coded.

### 3. Start the app

```bash
npm run start:dev
# or
APP_ENV=development npx expo start
```

### 4. Test OTP locally

The local Supabase instance has **test phone numbers** configured in `supabase/config.toml`:

| Phone          | OTP Code |
| -------------- | -------- |
| `+15551112222` | `123456` |
| `+15559999999` | `123456` |
| `+11234567890` | `123456` |

Use these on the login screen to bypass real SMS sending. Any other phone number will attempt to send a real SMS via Twilio (which requires valid Twilio credentials in the local env).

### 5. Inspect auth state

- **Supabase Dashboard** → Authentication → Users (at `http://127.0.0.1:54323`)
- **AsyncStorage** — use Flipper or React Native Debugger to inspect stored session tokens
- **Console logs** — `onAuthStateChange` events are handled in `AuthContext`

### File map

| File                                     | Role                                                      |
| ---------------------------------------- | --------------------------------------------------------- |
| `lib/supabase.ts`                        | Supabase client (lazy init, AsyncStorage, auto-refresh)   |
| `lib/auth.ts`                            | API layer — `sendOtp()`, `verifyOtp()`, `resendOtp()`     |
| `lib/env.ts`                             | `getAppEnv()`, `isDev()`, `isStaging()`, `isProduction()` |
| `contexts/AuthContext.tsx`               | React context — session / user / onboarding state         |
| `app/_layout.tsx`                        | Root layout with auth-gated navigation                    |
| `app/(auth)/login.tsx`                   | Phone number input screen                                 |
| `app/(auth)/verify-otp.tsx`              | OTP verification screen                                   |
| `app/dashboard/dashboard.tsx`            | Animated splash with auth check                           |
| `app/(auth)/onboarding.tsx`              | First-time user onboarding carousel                       |
| `supabase/functions/phone-auth/index.ts` | Edge function (rate limit + OTP proxy)                    |

---

## Tester Guide

### Environment: staging

Testers use the **staging** build which points to the staging Supabase project.

### Getting the build

```bash
# Build internally
npm run build:staging

# Or if distributed via EAS:
eas build --profile staging --platform all
```

The staging build has `bundleIdentifier` / `package` suffixed with `.staging` so it can be installed alongside the production app.

### Testing login

1. Open the app — you'll see the animated splash, then the login screen.
2. Enter a **real phone number** (staging uses the remote Twilio integration).
3. Receive the SMS OTP and enter it on the verify screen.
4. First-time users see the onboarding carousel → tap "Skip tour" / "Done".
5. You're on the dashboard.

### Testing session persistence

1. Sign in normally.
2. Force-close the app.
3. Re-open — you should land directly on the dashboard (no login).

### Testing sign-out

1. From the dashboard, trigger sign-out (when implemented in the dashboard UI).
2. You should be redirected to the login screen.
3. Re-opening the app shows the animated splash → login.

### Testing rate limiting

The edge function enforces:

| Limit                  | Value                   |
| ---------------------- | ----------------------- |
| OTP sends per phone    | 5 per 15 min            |
| OTP sends per IP       | 10 per 15 min           |
| Cooldown between sends | 30 seconds              |
| Verify attempts        | 5 before 15-min lockout |

To test: enter a wrong OTP 5 times — you should see "Too many attempts. Try again later." with a retry countdown.

### Test phone numbers (local dev only)

Test phones only work against the local Supabase instance. The staging/production instances require real SMS.

---

## Production Notes

### Pre-launch checklist

- [ ] Fill in `.env.production` with real Supabase production URL + anon key
- [ ] Ensure the `phone-auth` edge function is deployed to the production Supabase project
- [ ] Verify Twilio credentials are set in the production Supabase project dashboard (Auth → Providers → Phone)
- [ ] Test the full flow on a production build (EAS): `npm run build:production`
- [ ] Confirm `autoRefreshToken` works by letting the app sit idle past the JWT expiry (default 1 hour) then performing an action

### Deploying the edge function

```bash
# Staging
supabase functions deploy phone-auth --project-ref <staging-project-ref>

# Production
supabase functions deploy phone-auth --project-ref <production-project-ref>
```

### GitHub branch → Supabase project mapping

| Branch    | Supabase Project       | Env File          |
| --------- | ---------------------- | ----------------- |
| `dev`     | Local (supabase start) | `.env.dev`        |
| `staging` | Staging project        | `.env.staging`    |
| `main`    | Production project     | `.env.production` |

Supabase is connected via GitHub integration — pushing to a branch auto-deploys migrations and edge functions to the corresponding project.

---

## Edge Function Reference

**Base URL:** `EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL`  
(e.g., `http://127.0.0.1:54321/functions/v1/phone-auth`)

### POST `/send-otp`

**Request:**

```json
{
  "phone": "+14155551234"
}
```

**Responses:**

| Status | Body                                                       | Meaning                                                           |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| 200    | `{ "success": true }`                                      | OTP sent (or silently succeeded — doesn't reveal if phone exists) |
| 400    | `{ "success": false, "error": "Invalid phone format..." }` | Phone not in E.164 format                                         |
| 429    | `{ "error": "Too many attempts...", "retryAfter": 120 }`   | Rate limited                                                      |
| 500    | `{ "success": false, "error": "Request failed" }`          | Internal error                                                    |

### POST `/verify-otp`

**Request:**

```json
{
  "phone": "+14155551234",
  "otp": "123456"
}
```

**Responses:**

| Status | Body                                                     | Meaning                                    |
| ------ | -------------------------------------------------------- | ------------------------------------------ |
| 200    | `{ "session": {...}, "user": {...} }`                    | Verified — includes JWT tokens             |
| 400    | `{ "error": "Invalid request" }`                         | Missing phone or OTP                       |
| 401    | `{ "error": "Invalid or expired OTP" }`                  | Wrong code (also records a failed attempt) |
| 429    | `{ "error": "Too many attempts...", "retryAfter": 900 }` | Locked out after 5 failures                |

---

## Troubleshooting

### "Missing EXPO_PUBLIC_SUPABASE_URL..."

You're running without the correct `.env` file loaded. Make sure you're using the right start command:

```bash
npm run start:dev       # loads .env.dev
npm run start:staging   # loads .env.staging
```

### OTP never arrives (staging/production)

1. Check Supabase dashboard → Auth → Providers → Phone — ensure Twilio SID, auth token, and messaging service SID are set.
2. Check the edge function logs: `supabase functions logs phone-auth --project-ref <ref>`
3. Verify the phone number is in correct E.164 format (e.g., `+14155551234`).

### "Too many attempts" immediately

The in-memory rate limiter in the edge function resets when the function cold-starts. On local dev, restart the function serve. On remote, redeploying resets it.

### Session not persisting across app restarts

1. Confirm `@react-native-async-storage/async-storage` is installed and linked.
2. Check that `persistSession: true` is set in `lib/supabase.ts` (it is by default for mobile).
3. Look for errors in `supabase.auth.getSession()` on startup.

### `app.config.ts` not found by Expo

Expo auto-detects `app.config.ts` (not `app.json.ts`). Ensure the file is named correctly at the project root.

### New user not shown onboarding

The `isNewUser` flag is determined by checking if `user.created_at` is within the last 10 seconds. If there's clock skew between the Supabase server and device, this detection might fail. In that case the user will be taken directly to the dashboard.
