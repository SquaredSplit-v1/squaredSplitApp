import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizePhoneE164Like(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  return `+${digits}`
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Parse body
    const body = await req.json()
    const { full_name, avatar_url } = body

    // Validate full_name
    if (!full_name || typeof full_name !== 'string' || full_name.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'full_name is required and must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate avatar_url if provided
    if (avatar_url && typeof avatar_url !== 'string') {
      return new Response(JSON.stringify({ error: 'avatar_url must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false },
      }
    )

    // Get authenticated user from JWT
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      full_name: full_name.trim(),
      onboarding_complete: true,
      updated_at: new Date().toISOString(),
    }

    // Keep profile phone synced for contact matching.
    // Some legacy users ended up with NULL profiles.phone.
    if (user.phone && typeof user.phone === 'string') {
      const normalized = normalizePhoneE164Like(user.phone)
      if (normalized) updatePayload.phone = normalized
    }

    // Only include avatar_url if provided
    if (avatar_url) {
      updatePayload.avatar_url = avatar_url
    }

    // Update profile
    const { data, error } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, profile: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
