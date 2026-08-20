/**
 * Groups screen data queries.
 * Fetches group list and per-group detail from Supabase.
 *
 * Graceful degradation: if the `groups` / `group_members` tables have not
 * been created in this Supabase project yet, every function returns an empty
 * result instead of throwing — no red LogBox overlay, no crash.
 */

import { supabase } from '@/lib/supabase/client'

export type GroupBalanceType = 'owes_you' | 'you_owe' | 'settled'

export interface GroupMember {
  userId: string
  name: string
  avatarUrl: string | null
  amount: number
  balanceType: GroupBalanceType
}

export interface Group {
  id: string
  name: string
  emoji: string | null
  avatarUrl: string | null
  balanceType: GroupBalanceType
  amount: number
  members: GroupMember[]
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * PostgREST error codes that mean "the table simply doesn't exist yet".
 * We treat these as an empty result, not an error, so the Groups screen
 * just shows the empty-state UI while the DB schema is still being set up.
 */
function isTableMissingError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as Record<string, unknown>
  // PGRST205 = table not in schema cache
  // 42P01   = PostgreSQL "undefined_table"
  return (
    e['code'] === 'PGRST205' ||
    e['code'] === '42P01' ||
    (typeof e['message'] === 'string' &&
      (e['message'] as string).toLowerCase().includes('schema cache'))
  )
}

export async function getGroups(
  userId: string
): Promise<{ data: Group[]; error?: string }> {
  // ── 1. Groups the user is a member of ──────────────────────────────────
  const { data: memberRows, error: memberErr } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)

  if (memberErr) {
    if (isTableMissingError(memberErr)) return { data: [] }
    console.error('[getGroups] group_members query failed:', memberErr)
    return { data: [], error: memberErr.message }
  }
  if (!memberRows || memberRows.length === 0) return { data: [] }

  const groupIds = memberRows.map(r => r.group_id)

  // ── 2. Group metadata ───────────────────────────────────────────────────
  const { data: groupRows, error: groupErr } = await supabase
    .from('groups')
    .select('id, name, emoji, avatar_url')
    .in('id', groupIds)

  if (groupErr) {
    if (isTableMissingError(groupErr)) return { data: [] }
    console.error('[getGroups] groups query failed:', groupErr)
    return { data: [], error: groupErr.message }
  }
  if (!groupRows || groupRows.length === 0) return { data: [] }

  // ── 3. All members for those groups ────────────────────────────────────
  const { data: allMembers, error: allMembersErr } = await supabase
    .from('group_members')
    .select('group_id, user_id, profiles(full_name, avatar_url)')
    .in('group_id', groupIds)

  if (allMembersErr) {
    if (isTableMissingError(allMembersErr)) return { data: [] }
    console.error('[getGroups] members detail query failed:', allMembersErr)
    return { data: [], error: allMembersErr.message }
  }

  // ── 4. Expenses + participants for balance calculation ──────────────────
  const { data: expenseRows, error: expErr } = await supabase
    .from('expenses')
    .select('id, amount, paid_by, group_id')
    .in('group_id', groupIds)

  if (expErr) {
    if (isTableMissingError(expErr)) return { data: [] }
    console.error('[getGroups] expenses query failed:', expErr)
    return { data: [], error: expErr.message }
  }

  const expenseIds = (expenseRows ?? []).map(e => e.id)
  let participantRows: { expense_id: string; user_id: string; share_amount: number }[] = []

  if (expenseIds.length > 0) {
    const { data: pRows, error: pErr } = await supabase
      .from('expense_participants')
      .select('expense_id, user_id, share_amount')
      .in('expense_id', expenseIds)

    if (pErr) {
      if (isTableMissingError(pErr)) return { data: [] }
      console.error('[getGroups] expense_participants query failed:', pErr)
      return { data: [], error: pErr.message }
    }
    participantRows = pRows ?? []
  }

  // ── Build group balance map: groupId → net balance for userId ───────────
  const groupBalanceMap = new Map<string, number>()
  for (const gId of groupIds) {
    const gExpenses = (expenseRows ?? []).filter(e => e.group_id === gId)
    let net = 0
    for (const exp of gExpenses) {
      const myShare = participantRows
        .filter(p => p.expense_id === exp.id && p.user_id === userId)
        .reduce((s, p) => s + Number(p.share_amount), 0)

      if (exp.paid_by === userId) {
        net += roundMoney(Number(exp.amount) - myShare)
      } else {
        net -= roundMoney(myShare)
      }
    }
    groupBalanceMap.set(gId, roundMoney(net))
  }

  // ── Build member map: groupId → GroupMember[] ───────────────────────────
  const memberMap = new Map<string, GroupMember[]>()
  for (const row of allMembers ?? []) {
    const profile = row.profiles as { full_name: string | null; avatar_url: string | null } | null
    const list = memberMap.get(row.group_id) ?? []
    list.push({
      userId: row.user_id,
      name: profile?.full_name ?? 'Member',
      avatarUrl: profile?.avatar_url ?? null,
      amount: 0,
      balanceType: 'settled',
    })
    memberMap.set(row.group_id, list)
  }

  const groups: Group[] = groupRows.map(g => {
    const net = groupBalanceMap.get(g.id) ?? 0
    const absNet = Math.abs(net)
    const balanceType: GroupBalanceType =
      net > 0.005 ? 'owes_you' : net < -0.005 ? 'you_owe' : 'settled'

    return {
      id: g.id,
      name: g.name,
      emoji: g.emoji ?? null,
      avatarUrl: g.avatar_url ?? null,
      balanceType,
      amount: absNet,
      members: memberMap.get(g.id) ?? [],
    }
  })

  return { data: groups }
}

export async function getGroupById(
  groupId: string
): Promise<{ data: Group | null; error?: string }> {
  const { data: g, error: gErr } = await supabase
    .from('groups')
    .select('id, name, emoji, avatar_url')
    .eq('id', groupId)
    .single()

  if (gErr) {
    if (isTableMissingError(gErr)) return { data: null }
    console.error('[getGroupById] groups query failed:', gErr)
    return { data: null, error: gErr.message }
  }
  if (!g) return { data: null }

  const { data: members, error: mErr } = await supabase
    .from('group_members')
    .select('user_id, profiles(full_name, avatar_url)')
    .eq('group_id', groupId)

  if (mErr) {
    if (isTableMissingError(mErr)) return { data: null }
    console.error('[getGroupById] group_members query failed:', mErr)
    return { data: null, error: mErr.message }
  }

  return {
    data: {
      id: g.id,
      name: g.name,
      emoji: g.emoji ?? null,
      avatarUrl: g.avatar_url ?? null,
      balanceType: 'settled',
      amount: 0,
      members: (members ?? []).map(m => {
        const p = m.profiles as { full_name: string | null; avatar_url: string | null } | null
        return {
          userId: m.user_id,
          name: p?.full_name ?? 'Member',
          avatarUrl: p?.avatar_url ?? null,
          amount: 0,
          balanceType: 'settled' as GroupBalanceType,
        }
      }),
    },
  }
}
