# Google Play release setup (SquaredSplit LLC — one time)

The Android AAB is built and waiting (`eas build` 4c6a57a2, version 0.2.0,
versionCode 15). To push it to the Play internal testing track, the Play
Console needs a service-account key that EAS Submit can use. Do this once
with **vvs.pedapati@gmail.com** (SquaredSplit LLC org account, ID
7371128956129212557):

## 1. Create the app entry (2 min)
- <https://play.google.com/console> → **All apps → Create app**
- Name: `SquaredSplit` · default language: English (US) · **App** · **Free**
- Accept the declarations → **Create app**
- Skip the dashboard checklist for now (store listing / data safety can
  come before the track is released to testers).

## 2. Create the service-account key (~5 min)
- Play Console → **Setup → API access**
- If asked, **link a Google Cloud project** (accept the default it offers)
- **Create a new service account** → it opens Google Cloud Console:
  - Create a service account named `squaredsplit-play`
  - **Keys → Add key → Create new key → JSON** → the file downloads
- Back in Play Console → API access → find the new service account under
  "Service accounts" → **Grant access** → role **Release to testing
  tracks** (Admin also works) → save

## 3. Hand me the key
Drop the downloaded JSON anywhere in `~/Downloads/` and tell me the file
name. I will place it at `./google-services.json` (gitignored) and run:

```
APP_ENV=production eas submit --platform android \
  --id 4c6a57a2-15f5-4d21-90d4-efdfc3f89da7 --profile production
```

The AAB lands in **Internal testing (draft)**; from there you add tester
emails/Google Group and the release goes live to that track.

## Notes
- The key previously found in Downloads
  (`play-console-service-acc-tldr@finora-492611`) belongs to another app —
  don't reuse it.
- Every future release needs no manual steps: `npm run build:production`
  builds and auto-submits both platforms once this key is in place.
- Play also requires: store listing (icon, screenshots, description),
  content rating, and the Data-safety form before the track is releasable —
  these are console forms; happy to draft the copy.
