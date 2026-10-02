/**
 * Expense invites: add people who are NOT on SquaredSplit to an expense via
 * a WhatsApp deep link. Backed by the create_expense_with_invites /
 * accept_expense_invite / get_expense_invite RPCs.
 */

import { supabase } from '@/lib/supabase/client'

export interface InviteDraft {
  /** E.164 phone, e.g. +919833333333 */
  phone: string
  name?: string | null
}

export interface CreatedInvite {
  invite_id: string
  phone: string
  name: string | null
  share_amount: number
}

export interface CreatedExpenseWithInvites {
  id: string
  title: string
  amount: number
  paid_by: string
  group_id: string | null
  people_count: number
  invites: CreatedInvite[]
}

export interface InviteSummary {
  found: boolean
  id?: string
  status?: 'pending' | 'accepted' | 'declined' | 'revoked'
  invitee_phone_masked?: string
  invitee_name?: string | null
  share_amount?: number
  expense_title?: string
  expense_amount?: number
  inviter_name?: string
}

function messageFromRpcError(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : ''
  // Map SS50xx/SS60xx codes to friendly copy.
  if (msg.includes('SS504')) return 'Add at least one more person or invite.'
  if (msg.includes('SS505')) return 'Maximum 20 people per expense.'
  if (msg.includes('SS603')) return 'This invite no longer exists.'
  if (msg.includes('SS604')) return 'This invite was sent to a different phone number.'
  if (msg.includes('SS605')) return 'This invite is no longer active.'
  return msg || fallback
}

export async function createExpenseWithInvites(input: {
  title: string
  amount: number
  paidBy: string
  participants: string[]
  invites: InviteDraft[]
  groupId?: string | null
  category?: string
  note?: string | null
  dueDate?: string | null
}): Promise<CreatedExpenseWithInvites> {
  const { data, error } = await supabase.rpc('create_expense_with_invites', {
    p_title: input.title,
    p_amount: input.amount,
    p_category: input.category ?? 'general',
    p_paid_by: input.paidBy,
    p_group_id: input.groupId ?? null,
    p_due_date: input.dueDate ?? null,
    p_note: input.note ?? null,
    p_participants: input.participants.map(id => ({ id })),
    p_invites: input.invites.map(i => ({ phone: i.phone, name: i.name ?? null })),
  })

  if (error) throw new Error(messageFromRpcError(error, 'Could not create expense'))

  const row = (Array.isArray(data) ? data[0] : data) as unknown as CreatedExpenseWithInvites
  if (!row?.id) throw new Error('Could not create expense')
  return row
}

export async function getInviteSummary(inviteId: string): Promise<InviteSummary | null> {
  const { data, error } = await supabase.rpc('get_expense_invite', {
    p_invite_id: inviteId,
  })

  if (error) return null
  const row = (Array.isArray(data) ? data[0] : data) as unknown as InviteSummary
  return row?.found ? row : null
}

export async function acceptExpenseInvite(
  inviteId: string
): Promise<{ expenseId: string; already: boolean }> {
  const { data, error } = await supabase.rpc('accept_expense_invite', {
    p_invite_id: inviteId,
  })

  if (error) throw new Error(messageFromRpcError(error, 'Could not accept invite'))

  const row = (Array.isArray(data) ? data[0] : data) as unknown as {
    expense_id: string
    already: boolean
  }
  if (!row?.expense_id) throw new Error('Could not accept invite')
  return { expenseId: row.expense_id, already: Boolean(row.already) }
}
