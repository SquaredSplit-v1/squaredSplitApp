// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)

const DEEP_LINK_BASE = "squaredsplit://invite?token="

function page(title: string, body: string, deepLink: string): string {
  const escapedLink = deepLink.replace(/&/g, "&amp;")
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SquaredSplit invite</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#F3F4F5;
         display:flex; justify-content:center; padding:48px 20px; margin:0; }
  .card { background:#fff; border-radius:20px; padding:32px 24px; max-width:380px;
          width:100%; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,.08); }
  .logo { font-size:28px; font-weight:800; color:#141414; letter-spacing:-.5px; }
  h1 { font-size:20px; color:#141414; margin:20px 0 8px; }
  p { color:#6B6B6B; font-size:14px; line-height:21px; margin:0 0 20px; }
  .btn { display:block; background:#141414; color:#fff; text-decoration:none;
         padding:14px; border-radius:12px; font-weight:600; font-size:15px; margin-top:10px; }
  .hint { font-size:12px; color:#9CA3AF; margin-top:16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">Squared Split</div>
    <h1>${title}</h1>
    ${body}
    <a class="btn" href="${escapedLink}">Open in SquaredSplit</a>
    <p class="hint">Don't have the app? Install it from the App Store or Google Play,
    then open this link again on your phone.</p>
  </div>
  <script>
    // Auto-open the app on phones where it is installed.
    var t = setTimeout(function () {}, 1500);
    window.location.replace("${escapedLink}");
  </script>
</body>
</html>`
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")

  if (req.method !== "GET" || !id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(page("Invalid invite", "<p>This invite link is not valid.</p>", "/"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  }

  const deepLink = `${DEEP_LINK_BASE}${encodeURIComponent(id)}`

  // Pull a safe summary via the anon-callable RPC for a nicer page.
  let title = "You're invited to split an expense"
  let body = "<p>Open or install SquaredSplit to see the details and accept.</p>"
  try {
    const { data } = await supabase.rpc("get_expense_invite", { p_invite_id: id })
    const row = Array.isArray(data) ? data[0] : data
    if (row && row.found) {
      const inviter = row.inviter_name ?? "A friend"
      title = `${inviter} invited you to split "${row.expense_title}"`
      body = `<p>Your share: <b>${row.share_amount}</b> of ${row.expense_amount} total.</p>
              <p>Open or install SquaredSplit and sign in with <b>${row.invitee_phone_masked}</b> to accept.</p>`
    }
  } catch (_e) {
    // Fall back to the generic copy — never block the landing page on this.
  }

  return new Response(page(title, body, deepLink), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
})
