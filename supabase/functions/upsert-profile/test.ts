// Test cases for upsert-profile Edge Function
// Run locally with: deno test --allow-env --allow-net supabase/functions/upsert-profile/test.ts

const BASE_URL =
  Deno.env.get('FUNCTION_URL') ?? 'http://127.0.0.1:54321/functions/v1/upsert-profile'
const TEST_JWT = Deno.env.get('TEST_JWT') ?? ''

async function callFunction(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  return {
    status: res.status,
    body: await res.json(),
  }
}

// Test 1 — No auth token → 401
Deno.test('returns 401 when no auth token', async () => {
  const { status, body } = await callFunction({ full_name: 'Arjun Test' })
  console.assert(status === 401, `Expected 401, got ${status}`)
  console.assert(body.error === 'Missing authorization header', `Unexpected error: ${body.error}`)
  console.log('✅ Test 1 passed: 401 on missing auth token')
})

// Test 2 — Missing full_name → 400
Deno.test('returns 400 when full_name is missing', async () => {
  const { status, body } = await callFunction({}, `Bearer ${TEST_JWT}`)
  console.assert(status === 400, `Expected 400, got ${status}`)
  console.log('✅ Test 2 passed: 400 on missing full_name')
})

// Test 3 — full_name too short → 400
Deno.test('returns 400 when full_name is less than 2 chars', async () => {
  const { status, body } = await callFunction({ full_name: 'A' }, `Bearer ${TEST_JWT}`)
  console.assert(status === 400, `Expected 400, got ${status}`)
  console.log('✅ Test 3 passed: 400 on short full_name')
})

// Test 4 — Valid request → 200
Deno.test('returns 200 and updates profile on valid request', async () => {
  const { status, body } = await callFunction(
    { full_name: 'Arjun Test', avatar_url: 'https://example.com/avatar.png' },
    `Bearer ${TEST_JWT}`
  )
  console.assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(body)}`)
  console.assert(body.success === true, 'Expected success: true')
  console.assert(body.profile.full_name === 'Arjun Test', 'full_name mismatch')
  console.assert(body.profile.onboarding_complete === true, 'onboarding_complete should be true')
  console.log('✅ Test 4 passed: profile updated successfully')
})

// Test 5 — Update without avatar_url → 200
Deno.test('returns 200 without avatar_url', async () => {
  const { status, body } = await callFunction({ full_name: 'Arjun Updated' }, `Bearer ${TEST_JWT}`)
  console.assert(status === 200, `Expected 200, got ${status}`)
  console.assert(body.profile.full_name === 'Arjun Updated', 'full_name not updated')
  console.log('✅ Test 5 passed: update without avatar_url works')
})
