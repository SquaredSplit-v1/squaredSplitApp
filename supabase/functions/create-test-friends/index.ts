import { createClient } from "@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create admin client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });

    const testUserId = "ebd993b3-65cd-460a-9f6f-3723d8343058";

    // Create friend profiles
    const friends = [
      {
        id: "11111111-1111-1111-1111-111111111111",
        full_name: "Alice Johnson",
        email: "alice@example.com",
        phone: "+1234567890",
        currency: "INR",
        onboarding_complete: true,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        full_name: "Bob Smith",
        email: "bob@example.com",
        phone: "+1234567891",
        currency: "INR",
        onboarding_complete: true,
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        full_name: "Carol Williams",
        email: "carol@example.com",
        phone: "+1234567892",
        currency: "INR",
        onboarding_complete: true,
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        full_name: "David Brown",
        email: "david@example.com",
        phone: "+1234567893",
        currency: "INR",
        onboarding_complete: true,
      },
    ];

    // Insert profiles - will fail if FK constraint exists and auth.users don't exist
    // So we need to either:
    // 1. Drop FK constraint temporarily, or
    // 2. Create in auth.users first
    // Using raw SQL to drop/readd constraint
    const { error: dropError } = await supabase.rpc("drop_fk_constraint", {}, {
      head: false,
    });

    // Insert profiles
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(friends);

    if (profileError) throw profileError;

    // Create expenses
    const now = new Date();
    const expenses = [
      {
        id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        amount: 3000.0,
        description: "Lunch at Italian restaurant",
        paid_by: testUserId,
        split_type: "equal",
        created_by: testUserId,
        created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
        amount: 1200.0,
        description: "Movie tickets for 3 people",
        paid_by: testUserId,
        split_type: "equal",
        created_by: testUserId,
        created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
        amount: 8000.0,
        description: "Weekend trip accommodation",
        paid_by: testUserId,
        split_type: "equal",
        created_by: testUserId,
        created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    const { error: expenseError } = await supabase
      .from("expenses")
      .upsert(expenses);

    if (expenseError) throw expenseError;

    // Create participants
    const participants = [
      // Lunch: Test User + Alice + Bob
      { expense_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", user_id: testUserId, share_amount: 1000.0 },
      { expense_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", user_id: "11111111-1111-1111-1111-111111111111", share_amount: 1000.0 },
      { expense_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", user_id: "22222222-2222-2222-2222-222222222222", share_amount: 1000.0 },
      // Movie: Test User + Carol + David
      { expense_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", user_id: testUserId, share_amount: 400.0 },
      { expense_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", user_id: "33333333-3333-3333-3333-333333333333", share_amount: 400.0 },
      { expense_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", user_id: "44444444-4444-4444-4444-444444444444", share_amount: 400.0 },
      // Trip: Test User + All friends
      { expense_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", user_id: testUserId, share_amount: 2000.0 },
      { expense_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", user_id: "11111111-1111-1111-1111-111111111111", share_amount: 2000.0 },
      { expense_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", user_id: "22222222-2222-2222-2222-222222222222", share_amount: 2000.0 },
      { expense_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", user_id: "33333333-3333-3333-3333-333333333333", share_amount: 2000.0 },
      { expense_id: "cccccccc-cccc-cccc-cccc-cccccccccccc", user_id: "44444444-4444-4444-4444-444444444444", share_amount: 2000.0 },
    ];

    const { error: participantError } = await supabase
      .from("expense_participants")
      .upsert(participants);

    if (participantError) throw participantError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test friends created successfully!",
        data: {
          friendsCreated: friends.length,
          expensesCreated: expenses.length,
          participantsCreated: participants.length,
        },
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 200 }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json", ...corsHeaders }, status: 400 }
    );
  }
});
