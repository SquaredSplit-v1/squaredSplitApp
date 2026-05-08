# Test Friends Setup for SquaredSplit

## Summary

Created test friend data for user `ebd993b3-65cd-460a-9f6f-3723d8343058` with 4 friend profiles and 3 shared expenses.

## Friends Created

| ID | Name | Email | Phone |
|---|---|---|---|
| `11111111-1111-1111-1111-111111111111` | Alice Johnson | alice@example.com | +1234567890 |
| `22222222-2222-2222-2222-222222222222` | Bob Smith | bob@example.com | +1234567891 |
| `33333333-3333-3333-3333-333333333333` | Carol Williams | carol@example.com | +1234567892 |
| `44444444-4444-4444-4444-444444444444` | David Brown | david@example.com | +1234567893 |

## Expenses Created

### 1. Lunch at Italian restaurant
- **Amount:** ₹3,000.00
- **Paid by:** Test User
- **Participants:** Alice, Bob, Test User (₹1,000 each)
- **Created:** 7 days ago

### 2. Movie tickets for 3 people
- **Amount:** ₹1,200.00
- **Paid by:** Test User
- **Participants:** Carol, David, Test User (₹400 each)
- **Created:** 3 days ago

### 3. Weekend trip accommodation
- **Amount:** ₹8,000.00
- **Paid by:** Test User
- **Participants:** Alice, Bob, Carol, David, Test User (₹2,000 each)
- **Created:** 1 day ago

## How to Apply This Data

### Option 1: Run SQL Directly via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select the project `bwkgphgnrrwczxkfeanz`
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy the SQL from `supabase/create-test-friends.sql`
6. Click **Run**

### Option 2: Deploy Edge Function

The Edge Function is located at: `supabase/functions/create-test-friends/index.ts`

```bash
# Deploy the function
npx supabase functions deploy create-test-friends --project-id bwkgphgnrrwczxkfeanz

# Then invoke it
node scripts/invoke-create-test-friends.js
```

### Option 3: Use Migration File

A migration file has been created at: `supabase/migrations/20250507120000_create_test_friends.sql`

```bash
# Push migrations to remote (requires Supabase CLI link)
npx supabase db push
```

## Files Created

- `supabase/create-test-friends.sql` - Raw SQL for manual execution
- `supabase/migrations/20250507120000_create_test_friends.sql` - Migration file
- `supabase/functions/create-test-friends/index.ts` - Edge Function (TypeScript/Deno)
- `scripts/invoke-create-test-friends.js` - Script to invoke the Edge Function
- `scripts/create-test-friends-admin.js` - Admin script for direct DB connection
- `docs/test-friends-setup.md` - This documentation

## Testing

After applying the data, you can verify it with:

```javascript
import { useGetFriends } from '@/lib/api/getFriends'

function TestComponent() {
  const { friends, isLoading } = useGetFriends()
  
  return (
    <div>
      <h2>Friends: {friends.length}</h2>
      {friends.map(f => <p key={f.id}>{f.full_name}</p>)}
    </div>
  )
}
```

## Database Schema

The data uses the following tables:
- `profiles` - User profiles (4 test friends + original user)
- `expenses` - Shared expenses (3 total)
- `expense_participants` - Links users to expenses (11 total entries)

All data is seeded with realistic timestamps and consistent split amounts.
