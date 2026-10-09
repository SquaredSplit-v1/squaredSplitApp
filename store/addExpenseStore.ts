import { create } from 'zustand'

import type { InviteDraft } from '@/lib/supabase/invites'

export type SplitType = 'equally' | 'exact' | 'percentage'

export type DueDatePreset = 'none' | '1w' | '2w' | '1m'

interface AddExpenseState {
  amount: string
  title: string
  note: string
  category: string
  dueDatePreset: DueDatePreset
  paidBy: string | null
  participants: string[]
  /** Contacts invited via WhatsApp — not on SquaredSplit yet. */
  invites: InviteDraft[]
  splitType: SplitType
  exactAmounts: Record<string, string>
  percentages: Record<string, string>
  isSubmitting: boolean

  setAmount: (v: string) => void
  setTitle: (v: string) => void
  setNote: (v: string) => void
  setCategory: (v: string) => void
  setDueDatePreset: (v: DueDatePreset) => void
  setPaidBy: (id: string) => void
  toggleParticipant: (id: string) => void
  setParticipants: (ids: string[]) => void
  toggleInvite: (draft: InviteDraft) => void
  setSplitType: (t: SplitType) => void
  setExactAmount: (userId: string, value: string) => void
  setPercentage: (userId: string, value: string) => void
  setSubmitting: (v: boolean) => void
  reset: () => void
}

const defaults = {
  amount: '',
  title: '',
  note: '',
  category: 'general',
  dueDatePreset: 'none' as DueDatePreset,
  paidBy: null,
  participants: [],
  invites: [] as InviteDraft[],
  splitType: 'equally' as SplitType,
  exactAmounts: {},
  percentages: {},
  isSubmitting: false,
}

export function dueDatePresetToIsoDate(preset: DueDatePreset): string | null {
  if (preset === 'none') return null
  const days = preset === '1w' ? 7 : preset === '2w' ? 14 : 30
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export const useAddExpenseStore = create<AddExpenseState>((set, get) => ({
  ...defaults,
  setAmount: v => set({ amount: v }),
  setTitle: v => set({ title: v }),
  setNote: v => set({ note: v }),
  setCategory: v => set({ category: v }),
  setDueDatePreset: v => set({ dueDatePreset: v }),
  setPaidBy: id => set({ paidBy: id }),

  toggleParticipant: id => {
    const { participants, exactAmounts, percentages } = get()
    if (participants.includes(id)) {
      const ea = { ...exactAmounts }
      const pc = { ...percentages }
      delete ea[id]
      delete pc[id]
      set({ participants: participants.filter(p => p !== id), exactAmounts: ea, percentages: pc })
    } else {
      set({ participants: [...participants, id] })
    }
  },

  setParticipants: ids => set({ participants: ids }),

  toggleInvite: draft => {
    const { invites } = get()
    if (invites.some(i => i.phone === draft.phone)) {
      set({ invites: invites.filter(i => i.phone !== draft.phone) })
    } else {
      set({ invites: [...invites, draft] })
    }
  },

  setSplitType: t => set({ splitType: t }),
  setExactAmount: (userId, val) =>
    set(s => ({ exactAmounts: { ...s.exactAmounts, [userId]: val } })),
  setPercentage: (userId, val) => set(s => ({ percentages: { ...s.percentages, [userId]: val } })),
  setSubmitting: v => set({ isSubmitting: v }),
  reset: () => set(defaults),
}))
