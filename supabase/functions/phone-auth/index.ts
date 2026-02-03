// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client with service role (server-side only - never expose to frontend)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Phone number validation regex (E.164 format)
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

// ============================================================================
// E.164 Phone Normalization
// ============================================================================

/**
 * Normalizes and validates phone number to E.164 format.
 * - Strips all non-digit characters except leading +
 * - Rejects local formats (must start with +)
 * - Returns null if invalid
 */
function normalizePhoneE164(phone: string | undefined | null): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Trim whitespace
  let normalized = phone.trim();

  // Must start with + (reject local formats)
  if (!normalized.startsWith("+")) {
    return null;
  }

  // Remove all non-digit characters except the leading +
  normalized = "+" + normalized.slice(1).replace(/\D/g, "");

  // Validate against E.164 regex
  if (!PHONE_REGEX.test(normalized)) {
    return null;
  }

  return normalized;
}

// ============================================================================
// Rate Limiting (In-memory - acceptable for now, consider Redis/KV for prod)
// ============================================================================

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

interface VerifyAttemptEntry {
  attempts: number;
  lockedUntil: number;
}

// Rate limit stores
const otpSendByPhone = new Map<string, RateLimitEntry>();
const otpSendByIP = new Map<string, RateLimitEntry>();
const verifyAttempts = new Map<string, VerifyAttemptEntry>();

// Rate limit constants
const OTP_SEND_LIMIT_PER_PHONE = 5;    // Max 5 OTPs per phone
const OTP_SEND_LIMIT_PER_IP = 10;       // Max 10 OTPs per IP
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const OTP_SEND_COOLDOWN_MS = 30 * 1000;    // 30 seconds between sends

const VERIFY_MAX_ATTEMPTS = 5;          // Max 5 verify attempts
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000; // 15 minute lockout after failures

// Helper: Get client IP
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
         req.headers.get("x-real-ip") ||
         "unknown";
}

// Helper: Check and update rate limit
function checkRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number,
  cooldownMs: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, firstRequest: now, lastRequest: now });
    return { allowed: true };
  }

  // Reset if window expired
  if (now - entry.firstRequest > windowMs) {
    store.set(key, { count: 1, firstRequest: now, lastRequest: now });
    return { allowed: true };
  }

  // Check cooldown
  if (now - entry.lastRequest < cooldownMs) {
    return { allowed: false, retryAfter: Math.ceil((cooldownMs - (now - entry.lastRequest)) / 1000) };
  }

  // Check limit
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - entry.firstRequest)) / 1000);
    return { allowed: false, retryAfter };
  }

  // Update entry
  entry.count++;
  entry.lastRequest = now;
  return { allowed: true };
}

// Helper: Check verify attempts
function checkVerifyAttempts(phone: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = verifyAttempts.get(phone);

  if (!entry) {
    return { allowed: true };
  }

  // Check if locked out
  if (entry.lockedUntil > now) {
    return { allowed: false, retryAfter: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  // Reset if lockout expired
  if (entry.lockedUntil <= now && entry.attempts >= VERIFY_MAX_ATTEMPTS) {
    verifyAttempts.delete(phone);
    return { allowed: true };
  }

  return { allowed: true };
}

// Helper: Record failed verify attempt
function recordFailedVerify(phone: string): void {
  const now = Date.now();
  const entry = verifyAttempts.get(phone);

  if (!entry) {
    verifyAttempts.set(phone, { attempts: 1, lockedUntil: 0 });
    return;
  }

  entry.attempts++;

  // Lock if max attempts reached
  if (entry.attempts >= VERIFY_MAX_ATTEMPTS) {
    entry.lockedUntil = now + VERIFY_LOCKOUT_MS;
  }
}

// Helper: Clear verify attempts on success
function clearVerifyAttempts(phone: string): void {
  verifyAttempts.delete(phone);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace("/phone-auth", "");

  try {
    // POST /send-otp - Send OTP to phone number
    if (req.method === "POST" && path === "/send-otp") {
      const { phone: rawPhone } = await req.json();

      // Normalize and validate phone to E.164 (rejects local formats)
      const phone = normalizePhoneE164(rawPhone);
      if (!phone) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid phone format. Use E.164 format (e.g., +14155551234)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit by phone number (uses normalized phone)
      const phoneLimit = checkRateLimit(
        otpSendByPhone,
        phone,
        OTP_SEND_LIMIT_PER_PHONE,
        OTP_SEND_WINDOW_MS,
        OTP_SEND_COOLDOWN_MS
      );
      if (!phoneLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", retryAfter: phoneLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limit by IP
      const clientIP = getClientIP(req);
      const ipLimit = checkRateLimit(
        otpSendByIP,
        clientIP,
        OTP_SEND_LIMIT_PER_IP,
        OTP_SEND_WINDOW_MS,
        OTP_SEND_COOLDOWN_MS
      );
      if (!ipLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", retryAfter: ipLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP via Supabase Auth
      await supabase.auth.signInWithOtp({ phone });

      // Always return generic success (no user existence checks)
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST /verify-otp - Verify OTP and create session (handles both sign-up and sign-in)
    if (req.method === "POST" && path === "/verify-otp") {
      const { phone: rawPhone, otp } = await req.json();

      // Normalize and validate phone to E.164
      const phone = normalizePhoneE164(rawPhone);
      if (!phone || !otp) {
        return new Response(
          JSON.stringify({ error: "Invalid request" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check rate limit for verify attempts (uses normalized phone)
      const verifyLimit = checkVerifyAttempts(phone);
      if (!verifyLimit.allowed) {
        return new Response(
          JSON.stringify({ error: "Too many attempts. Try again later.", retryAfter: verifyLimit.retryAfter }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP via Supabase Auth (uses normalized phone)
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: "sms",
      });

      if (error) {
        // Record failed attempt
        recordFailedVerify(phone);
        // Do NOT expose raw Supabase/Twilio errors
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clear verify attempts on success
      clearVerifyAttempts(phone);

      // Return session + user to frontend
      return new Response(
        JSON.stringify({
          session: data.session,
          user: data.user,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (_error) {
    // Generic error response (no detailed error messages)
    return new Response(
      JSON.stringify({ success: false, error: "Request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/phone-auth' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
