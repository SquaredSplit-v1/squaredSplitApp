# Supabase Database — Policy Decisions

## RLS Philosophy
All tables have RLS enabled by default. No table is left unprotected.
Policies follow the principle of least privilege.

---

## profiles

| Policy | Operation | Role | Rule |
|---|---|---|---|
| `profiles_select_authenticated` | SELECT | authenticated | `true` (any authenticated user can read any profile — needed for friend search) |
| `profiles_update_own` | UPDATE | authenticated | `auth.uid() = id` (users can only update their own row) |

**No INSERT policy** — profile rows are created automatically by the `on_auth_user_created` trigger when a user signs up. Direct client inserts are intentionally blocked.

**No DELETE policy** — account deletion is handled via a secured Edge Function only, never directly from the client.

---

## device_tokens

| Policy | Operation | Role | Rule |
|---|---|---|---|
| `device_tokens_select_own` | SELECT | authenticated | `auth.uid() = user_id` |
| `device_tokens_insert_own` | INSERT | authenticated | `auth.uid() = user_id` |
| `device_tokens_delete_own` | DELETE | authenticated | `auth.uid() = user_id` |

---

## Testing RLS policies
Use SQL Editor with `SET LOCAL role` and `SET LOCAL request.jwt.claims` to impersonate users.
Always test:
1. Authenticated user reading own row ✅
2. Authenticated user reading another user's row (allowed or blocked per policy) ✅
3. Authenticated user modifying another user's row → should return 0 rows ✅
4. Unauthenticated (anon) access → should return 0 rows ✅
