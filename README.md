# SquaredSplit

> Split expenses fairly. Settle up simply.

A React Native mobile app built with Expo and Supabase for splitting bills,
tracking shared expenses, and simplifying group debts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 52 |
| Routing | Expo Router v3 (file-based) |
| Backend | Supabase (Auth · Postgres · Storage · Edge Functions) |
| State | Zustand |
| Styling | NativeWind (Tailwind for RN) |
| Build | EAS Build + EAS Update (OTA) |
| CI/CD | GitHub Actions + EAS |

---

## Prerequisites

- Node.js 18+
- [Expo CLI](https://docs.expo.dev/get-started/installation/): `npm install -g expo-cli`
- [EAS CLI](https://docs.expo.dev/eas/): `npm install -g eas-cli`
- Xcode (iOS) or Android Studio (Android)
- A Supabase account (project already provisioned — see team lead for access)

---

## Environment Setup

This project uses separate `.env` files per environment.
**Never commit `.env.*` files (except `.env.example`) to the repository.**

### Environment Files

Expo CLI auto-loads env files based on `NODE_ENV` (see `@expo/env`):
`expo start` uses `development`, release builds/`expo export` use `production`.
There is **no** `--env-file` / `EXPO_ENV_FILE` mechanism in SDK 54 — the file
name must match the mode.

| File | Loaded when | Purpose | Committed? |
|---|---|---|---|
| `.env.development` | `expo start` (dev server) | Dev Supabase branch values | ❌ No |
| `.env.local` | always (overrides the above) | Per-developer overrides | ❌ No |
| `.env.production` | release builds / `expo export` | Production values | ❌ No |
| `.env` | always (lowest priority) | Fallback | ❌ No |
| `.env.example` | never | Template with all variable names | ✅ Yes |

### Required Variables

Copy `.env.example` and fill in the values (get them from the team lead or
Supabase dashboard → Project Settings → API):

```bash
cp .env.example .env.development
```

**Client-side variables** (must use `EXPO_PUBLIC_` prefix to be accessible in app code):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL=https://xxxx.supabase.co/functions/v1/phone-auth
EXPO_PUBLIC_APP_ENV=development
```

> `EXPO_PUBLIC_SUPABASE_PHONE_AUTH_URL` is required for login — without it the
> OTP screens cannot reach the `phone-auth` Edge Function.

**Build-time only variables** (no prefix — used in `app.config.ts` and build
scripts only, never in app bundle):

```bash
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Supabase Setup

This project uses **Supabase Branching** with three persistent branches:

| Branch | Maps to | Supabase Branch |
|---|---|---|
| `main` | Production | `main` (prod) |
| `staging` | Staging | `staging` |
| `dev` | Local + dev builds | `dev` |

Supabase Pro is required for branching (already subscribed).
GitHub is connected to Supabase for auto branch preview environments.

To apply migrations to the linked project (after `supabase login` and
`supabase link --project-ref <ref>`):

```bash
npx supabase db push
```

Edge Functions used by the app:

```bash
npx supabase functions deploy phone-auth
npx supabase functions deploy create-expense
npx supabase functions deploy delete-account
```

---

## EAS Build & Secrets

Environment variables for cloud builds are stored in **EAS Secrets** —
they are never committed to the repo.

### Verify secrets are configured

```bash
eas secret:list
```

### Build profiles

| Profile | Branch | Environment | Purpose |
|---|---|---|---|
| `development` | `dev` | Dev Supabase | Local dev client build |
| `staging` | `staging` | Staging Supabase | Internal testing / QA |
| `production` | `main` | Prod Supabase | App Store / Play Store |

### Trigger a build

```bash
# Development build (installs on device via dev client)
eas build --profile development --platform all

# Staging build (for QA testing)
eas build --profile staging --platform all

# Production build (for store submission)
eas build --profile production --platform all
```

### OTA Updates (EAS Update)

Over-the-air JS bundle updates are deployed via EAS Update.
No new native build required for JS-only changes.

```bash
# Push update to staging channel
eas update --branch staging --message "fix: OTP screen keyboard handling"

# Push update to production channel
eas update --branch production --message "feat: groups tab"
```

---

## Local Development

### 1. Install dependencies

```bash
npm install
```

### 2. Start the app

```bash
npm run start:dev
```

This runs `expo start` with `APP_ENV=development`; the Supabase values are
read automatically from `.env.development`.

Press:
- `i` — iOS Simulator
- `a` — Android Emulator
- Scan QR — Expo Go (limited, use dev build for Supabase auth)

> ⚠️ Supabase Auth (phone OTP) requires a **development build**, not Expo Go.
> Run `eas build --profile development` once and install the `.ipa`/`.apk` on your device.

---

## Branch Strategy
main ← production releases only (PRs from staging)
staging ← QA and client preview (PRs from dev)
dev ← integration branch (PRs from feature/* branches)
feature/SS-XXX-short-title ← individual feature branches


### Workflow

```bash
# 1. Cut a feature branch from dev
git checkout dev && git pull
git checkout -b feature/SS-042-group-invite-qr

# 2. Build, commit, push
git push origin feature/SS-042-group-invite-qr

# 3. Open PR → dev
# 4. After review and merge → staging → main
```

---

## Project Structure
squaredsplit/
├── app/ # Expo Router screens (file-based routing)
│ ├── (auth)/ # Auth screens (login, OTP, onboarding)
│ └── (app)/ # Main app screens (tabs + modals)
├── components/ # Shared UI components
├── hooks/ # Custom React hooks
├── lib/
│ ├── supabase.ts # Supabase client initialisation
│ └── utils/ # Utility functions (formatCurrency, etc.)
├── store/ # Zustand state stores
├── types/ # TypeScript types and DB schema types
├── supabase/
│ └── migrations/ # Supabase DB migration files
├── .env.example # ← Copy this and fill in values
├── app.config.ts # Expo app config (reads env vars)
├── eas.json # EAS build profiles
└── README.md


---