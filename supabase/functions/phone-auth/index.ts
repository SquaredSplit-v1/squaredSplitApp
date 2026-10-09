// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

// ============================================================================
// E.164 Phone Normalization
// ============================================================================

const PHONE_REGEX = /^\+[1-9]\d{6,14}$/

function normalizePhoneE164(phone: string | undefined | null): string | null {
  if (!phone || typeof phone !== "string") return null
  let normalized = phone.trim()
  if (!normalized.startsWith("+")) return null
  normalized = "+" + normalized.slice(1).replace(/\D/g, "")
  if (!PHONE_REGEX.test(normalized)) return null
  return normalized
}

// ============================================================================
// Rate Limiting Constants
// ============================================================================

const OTP_SEND_LIMIT  = 5                      // 5 sends per window
const OTP_WINDOW_MS   = 10 * 60 * 1000         // 10 min rolling window
const OTP_COOLDOWN_MS = 30 * 1000              // 30s between sends
const LOCKOUT_MS      = 10 * 60 * 1000         // 10 min lockout after limit hit

const VERIFY_MAX_ATTEMPTS = 5                  // 5 wrong OTPs before lockout
const VERIFY_LOCKOUT_MS   = 10 * 60 * 1000     // 10 min lockout after failed verifies

// ============================================================================
// Rate Limiting — Send OTP
// ============================================================================

async function checkAndIncrementRateLimit(
  phone: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()
  const windowStart = new Date(now.getTime() - OTP_WINDOW_MS)

  const { data: existing } = await supabase
    .from("otp_rate_limits")
    .select("*")
    .eq("phone", phone)
    .single()

  // First ever attempt — insert and allow
  if (!existing) {
    await supabase.from("otp_rate_limits").insert({
      phone,
      attempt_count: 1,
      window_start: now.toISOString(),
      last_attempt: now.toISOString(),
    })
    return { allowed: true }
  }

  // Active lockout
  if (existing.locked_until && new Date(existing.locked_until) > now) {
    const retryAfter = Math.ceil(
      (new Date(existing.locked_until).getTime() - now.getTime()) / 1000
    )
    return { allowed: false, retryAfter }
  }

  // Expired window — reset and allow
  if (new Date(existing.window_start) < windowStart) {
    await supabase
      .from("otp_rate_limits")
      .update({
        attempt_count: 1,
        window_start: now.toISOString(),
        last_attempt: now.toISOString(),
        locked_until: null,
      })
      .eq("phone", phone)
    return { allowed: true }
  }

  // Cooldown between individual sends
  const timeSinceLast = now.getTime() - new Date(existing.last_attempt).getTime()
  if (timeSinceLast < OTP_COOLDOWN_MS) {
    const retryAfter = Math.ceil((OTP_COOLDOWN_MS - timeSinceLast) / 1000)
    return { allowed: false, retryAfter }
  }

  // ✅ Check limit BEFORE incrementing — prevents off-by-one lockout
  if (existing.attempt_count >= OTP_SEND_LIMIT) {
    const lockedUntil = new Date(now.getTime() + LOCKOUT_MS)
    await supabase
      .from("otp_rate_limits")
      .update({ locked_until: lockedUntil.toISOString() })
      .eq("phone", phone)
    return { allowed: false, retryAfter: Math.ceil(LOCKOUT_MS / 1000) }
  }

  // Under limit — increment and allow
  await supabase
    .from("otp_rate_limits")
    .update({
      attempt_count: existing.attempt_count + 1,
      last_attempt: now.toISOString(),
    })
    .eq("phone", phone)

  return { allowed: true }
}

// ============================================================================
// Rate Limiting — Verify OTP
// ============================================================================

async function checkVerifyAttempts(
  phone: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = new Date()

  const { data: existing } = await supabase
    .from("otp_rate_limits")
    .select("verify_attempts, verify_locked_until")
    .eq("phone", phone)
    .single()

  if (!existing) return { allowed: true }

  if (existing.verify_locked_until && new Date(existing.verify_locked_until) > now) {
    const retryAfter = Math.ceil(
      (new Date(existing.verify_locked_until).getTime() - now.getTime()) / 1000
    )
    return { allowed: false, retryAfter }
  }

  return { allowed: true }
}

async function recordFailedVerify(phone: string): Promise<void> {
  const now = new Date()

  const { data: existing } = await supabase
    .from("otp_rate_limits")
    .select("verify_attempts")
    .eq("phone", phone)
    .single()

  const newAttempts = (existing?.verify_attempts ?? 0) + 1
  const lockedUntil = newAttempts >= VERIFY_MAX_ATTEMPTS
    ? new Date(now.getTime() + VERIFY_LOCKOUT_MS).toISOString()
    : null

  await supabase
    .from("otp_rate_limits")
    .upsert({
      phone,
      verify_attempts: newAttempts,
      verify_locked_until: lockedUntil,
      window_start: now.toISOString(),
      last_attempt: now.toISOString(),
    })
}

async function clearVerifyAttempts(phone: string): Promise<void> {
  await supabase
    .from("otp_rate_limits")
    .update({ verify_attempts: 0, verify_locked_until: null })
    .eq("phone", phone)
}

// ============================================================================
// CORS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace("/phone-auth", "")

  try {
    // ── POST /send-otp ───────────────────────────────────────────────────────
    if (req.method === "POST" && path === "/send-otp") {
      const { phone: rawPhone } = await req.json()

      const phone = normalizePhoneE164(rawPhone)
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid phone format. Use E.164 (e.g. +919876543210)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const rateLimit = await checkAndIncrementRateLimit(phone)
      if (!rateLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", retryAfter: rateLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({ phone })

      if (otpError) {
        // Don't count provider failures against the user's send budget —
        // a broken SMS provider would otherwise lock them out after 5 tries.
        await supabase
          .from("otp_rate_limits")
          .update({ attempt_count: 0 })
          .eq("phone", phone)

        const msg = otpError.message ?? ""
        const smsFailed = /sms_send_failed|error sending/i.test(msg)
        return new Response(
          JSON.stringify({
            success: false,
            error: smsFailed
              ? "We couldn't send the SMS right now. Please try again in a moment."
              : msg || "Failed to send OTP",
            code: otpError.code ?? null,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── POST /verify-otp ─────────────────────────────────────────────────────
    if (req.method === "POST" && path === "/verify-otp") {
      const { phone: rawPhone, otp } = await req.json()

      const phone = normalizePhoneE164(rawPhone)
      if (!phone || !otp) {
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const verifyLimit = await checkVerifyAttempts(phone)
      if (!verifyLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", retryAfter: verifyLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      })

      if (error) {
        await recordFailedVerify(phone)
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      await clearVerifyAttempts(phone)

      return new Response(
        JSON.stringify({ session: data.session, user: data.user }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── 404 ──────────────────────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (_error) {
    return new Response(
      JSON.stringify({ success: false, error: "Request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})