// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS })
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405)
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? ""
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "Missing authorization header" }, 401)
    }

    // Verify the caller's JWT and make sure it matches the account being
    // deleted — nobody can delete someone else's account.
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))

    if (callerError || !caller) {
      return json({ error: "Invalid session" }, 401)
    }

    const body = (await req.json().catch(() => ({}))) as { userId?: string }
    const userId = body.userId
    if (!userId || userId !== caller.id) {
      return json({ error: "userId does not match the authenticated user" }, 403)
    }

    // 1. Remove avatar files from Storage (best-effort).
    try {
      await supabase.storage.from("avatars").remove([`${userId}/avatar.jpg`, `${userId}/avatar.png`, `${userId}/avatar.jpeg`])
    } catch (_e) {
      // Storage cleanup must never block account deletion.
    }

    // 2. Delete the profile row; related rows (group_members, friend_notes,
    //    friend_settings, expense_rejections) cascade via FKs. Expenses and
    //    expense_participants reference auth.users and cascade on step 3.
    await supabase.from("profiles").delete().eq("id", userId)

    // 3. Delete the auth user itself. Doing this last means any failure above
    //    leaves a recoverable state.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
    if (deleteError) {
      return json({ error: `Could not delete auth user: ${deleteError.message}` }, 500)
    }

    return json({ success: true })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500)
  }
})
