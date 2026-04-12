// lib/api/createExpense.ts
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const createExpenseSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  participants: z.array(z.string()).min(1).max(10), // user IDs
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>

function getSupabase() {
  return createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL as string,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
  )
}

export async function createExpense(input: CreateExpenseInput) {
  const data = createExpenseSchema.parse(input)
  const supabase = getSupabase()

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
  for (let i = 0; i < remainder; i += 1) {
    sharesPaise[i] += 1
  }
  const shareAmounts = sharesPaise.map(s => s / 100)

  const { data: expense, error: expenseError } = await supabase
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

  const participantRows = data.participants.map((userId, index) => ({
    expense_id: expense.id,
    user_id: userId,
    share_amount: shareAmounts[index],
    is_settled: false,
  }))

  const { error: participantsError } = await supabase
    .from('expense_participants')
    .insert(participantRows)

  if (participantsError) {
    await supabase.from('expenses').delete().eq('id', expense.id)
    throw new Error(participantsError.message)
  }

  return {
    ...expense,
    participants: participantRows,
  }
}
