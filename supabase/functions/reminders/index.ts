// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
}

/**
 * Friendly settle-up reminders ("AI nudges"). Scheduled daily via pg_cron —
 * the caller must present the REMINDERS_SECRET header (set with
 * `supabase secrets set REMINDERS_KEY=...`), which the cron job includes.
 *
 * For every user with activity, computes:
 *  - friends with an outstanding balance (oldest first, capped)
 *  - overdue expenses (due_date in the past, unsettled)
 * and writes at most a couple of `ai_reminder` activity_feed rows per user,
 * deduped so the same nudge isn't repeated within 3 days.
 */

interface ReminderOut {
  user_id: string
  key: string
  message: string
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length]
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })

  const url = new URL(req.url)
  if (url.searchParams.get("key") !== Deno.env.get("REMINDERS_KEY")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: CORS,
    })
  }

  // 1) Everyone who has ever transacted, with their friend balances.
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .limit(5000)
  if (usersError || !users) {
    return new Response(JSON.stringify({ error: "no profiles" }), { status: 500, headers: CORS })
  }

  const out: ReminderOut[] = []

  for (const u of users) {
    const { data: overview } = await supabase.rpc("get_friends_overview", {
      p_user_id: u.id,
    })
    const friends = (overview ?? []) as Array<{
      friend_id: string
      full_name: string | null
      net_balance: number
      expense_count: number
      last_activity_at: string | null
      has_overdue: boolean
    }>
    const outstanding = friends.filter((f) => Math.abs(Number(f.net_balance)) > 0.005)

    // Oldest outstanding friend first; at most one balance nudge per user/day.
    if (outstanding.length > 0) {
      outstanding.sort(
        (a, b) =>
          new Date(a.last_activity_at ?? 0).getTime() - new Date(b.last_activity_at ?? 0).getTime()
      )
      const f = outstanding[0]
      const name = (f.full_name ?? "a friend").split(" ")[0]
      const amt = Math.abs(Number(f.net_balance)).toFixed(0)
      const youOwe = Number(f.net_balance) < 0
      const day = new Date().getDate()
      const message = youOwe
        ? pick(
            [
              `Friendly nudge: you owe ${name} ${amt}. A quick settle-up keeps it squeaky clean 🧾`,
              `${name} covered you recently — ${amt} is still open whenever you're ready 🙂`,
              `Heads up: ${amt} pending with ${name}. Tap below to square up!`,
            ],
            day + u.id.length
          )
        : pick(
            [
              `Gentle reminder: ${name} owes you ${amt}. Send them a nudge 💬`,
              `${amt} is still pending from ${name} — a friendly ping might help!`,
              `Your wallet remembers: ${name} owes you ${amt} 😊`,
            ],
            day + u.id.length
          )
      out.push({ user_id: u.id, key: `balance:${f.friend_id}`, message })
    }

    // Overdue expenses nudge (users with any overdue share).
    const hasOverdue = friends.some((f) => f.has_overdue)
    if (hasOverdue && outstanding.length === 0) {
      out.push({
        user_id: u.id,
        key: "overdue",
        message:
          "One of your splits is past its pay-back date ⏰ Tapping in and settling it keeps your streak clean.",
      })
    }
  }

  // 2) Dedupe: skip keys already nudged in the last 3 days.
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  let written = 0
  for (const r of out) {
    const { data: existing } = await supabase
      .from("activity_feed")
      .select("id")
      .eq("user_id", r.user_id)
      .eq("type", "ai_reminder")
      .eq("seen", false)
      .gte("created_at", threeDaysAgo)
      .contains("metadata", { key: r.key })
      .limit(1)
    if (existing && existing.length > 0) continue

    const { error } = await supabase.from("activity_feed").insert({
      user_id: r.user_id,
      type: "ai_reminder",
      metadata: { key: r.key, message: r.message },
    })
    if (!error) written++
  }

  return new Response(
    JSON.stringify({ success: true, considered: out.length, written }),
    { headers: CORS }
  )
})
