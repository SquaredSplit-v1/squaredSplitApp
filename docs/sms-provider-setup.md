# SMS / OTP delivery (phone sign-in) — Twilio replaced

Phone number is the sign-in credential. Supabase Auth still **generates and
verifies** the OTP (rate limits, 60s expiry, test numbers), but **delivery** now
goes through our own `send-sms` edge function via Supabase's *Send SMS* auth
hook — so any SMS gateway can be used without touching auth logic. Twilio is
no longer involved.

```
app → phone-auth fn → Supabase Auth (OTP) → Send-SMS hook → send-sms fn → MSG91 → user's phone
```

Status per project (dev / staging / main): hook **enabled**, function
**deployed**, hook secret set. Test numbers (`919123456789=654321`,
`918001234567=111111`, `919876543210=123456`) bypass delivery and keep working
regardless of the gateway.

## Why MSG91 (India) + Vonage (US & rest)
The hook routes by recipient region:
- **+91 India → MSG91**: ~₹0.15–0.20 per OTP, DLT-compliant (mandatory in
  India for transactional SMS — the usual reason Twilio deliveries to Indian
  numbers fail).
- **US & other international → Vonage**: simple HTTP API, US number support.

Both gateways are configured per environment; a number missing either
gateway's credentials gets a clear delivery error only when that region is
used.

## MSG91 setup — Indian numbers (~20 min + DLT approval wait)
1. **Account**: <https://msg91.com> → sign up with the SquaredSplit business
   details → verify.
2. **DLT registration** (Indian regulation, done once):
   - Register SquaredSplit LLC as a Principal Entity on a DLT portal
     (Jio/Airtel/Vodafone/BSNL — Jio TrueConnect is simplest). Needs company
     PAN/GST/CIN. Approval: 1–3 days.
   - Register a **sender ID** (6 letters, e.g. `SQSPLT`) under "Transactional".
   - Register an **OTP template**, e.g.
     `Your SquaredSplit verification code is {#var#}. It expires in 5 minutes.`
     (Transactional / OTP category). Note the DLT template id.
3. **MSG91 → Flow**: create a flow using that DLT template; set the variable
   name to `OTP`. Copy the MSG91 **Template/Flow ID**.
4. **MSG91 → Authkey**: copy the account auth key.
5. Send me: `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID`, and the sender ID.
   I will set them as secrets on all three projects — Indian numbers then
   receive OTPs immediately, no app release needed.

## Vonage setup — US & international numbers (~15 min)
1. <https://dashboard.vonage.com> → sign up with the SquaredSplit business
   details → buy **credit** (~$20 is plenty for testing).
2. **Numbers → Buy number**: pick a US number with SMS capability
   (~$1/mo) — this becomes the sender.
3. **US A2P 10DLC**: OTP traffic to US numbers requires brand + campaign
   registration (Vonage dashboard walks through it; ~$4 brand + monthly
   campaign fee, 1–3 days approval). Until approved, US carriers may filter
   the OTPs.
4. Send me: `VONAGE_API_KEY`, `VONAGE_API_SECRET`, `VONAGE_FROM_NUMBER`
   (the purchased number). I set them as secrets on all three projects —
   US numbers receive OTPs immediately.

## Interim
Until the keys are set, a real-number OTP request returns the friendly
"We couldn't send the SMS right now" message, and the three test numbers keep
working for QA/TestFlight testers.

## Swapping providers later
`send-sms/index.ts` isolates delivery in `sendViaMsg91` (India) and
`sendViaVonage` (international); `routeFor` picks by number. To add another
gateway, add a `sendViaX` function and a branch in `routeFor`.
`SMS_PROVIDER=msg91|vonage|log` forces a route; `log` prints OTPs to the
function logs for local debugging.

## Security
Supabase signs every hook call (Standard Webhooks: `webhook-signature` HMAC
over id.timestamp.body with the shared secret); the function rejects unsigned
or stale (>5 min) requests. The secret lives only in Supabase (auth config +
function secrets).
