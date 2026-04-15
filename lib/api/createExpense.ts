// lib/api/createExpense.ts
import { z } from 'zod'

import { supabase } from '@/lib/supabase'

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  participants: z.array(z.string()).min(1).max(10),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

export async function createExpense(input: CreateExpenseInput) {
  const data = createExpenseSchema.parse(input)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw new Error(authError.message)
  if (!user) throw new Error('Unauthorized')

  const numParticipants = data.participants.length
  const totalPaise = Math.round(data.amount * 100)
  const basePaise = Math.floor(totalPaise / numParticipants)
  const remainder = totalPaise % numParticipants
  const sharesPaise = Array<number>(numParticipants).fill(basePaise)
  for (let i = 0; i < remainder; i += 1) sharesPaise[i] += 1
  const shareAmounts = sharesPaise.map(p => p / 100)

  const { data: expense, error: expenseError } = await db
    .from('expenses')
    .insert({
      amount: data.amount,
      description: data.description,
      paid_by: user.id,
      created_by: user.id,
      split_type: 'equal',
    })
    .select('*')
    .single()

  if (expenseError || !expense) {
    throw new Error(expenseError?.message ?? 'Failed to create expense')
  }

  const participantRows = data.participants.map((userId: string, index: number) => ({
    expense_id: expense.id,
    user_id: userId,
    share_amount: shareAmounts[index],
    is_settled: false,
  }))

  const { error: participantsError } = await db.from('expense_participants').insert(participantRows)

  if (participantsError) {
    await db.from('expenses').delete().match({ id: expense.id })
    throw new Error(participantsError.message)
  }

  return {
    id: expense.id as string,
    amount: expense.amount as number,
    description: expense.description as string,
    participants: participantRows,
  }
}
