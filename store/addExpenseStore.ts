import { create } from 'zustand'

export type SplitType = 'equally' | 'exact' | 'percentage'

interface AddExpenseState {
  amount: string
  title: string
  paidBy: string | null
  participants: string[]
  splitType: SplitType
  exactAmounts: Record<string, string>
  percentages: Record<string, string>
  isSubmitting: boolean

  setAmount: (v: string) => void
  setTitle: (v: string) => void
  setPaidBy: (id: string) => void
  toggleParticipant: (id: string) => void
  setSplitType: (t: SplitType) => void
  setExactAmount: (userId: string, value: string) => void
  setPercentage: (userId: string, value: string) => void
  setSubmitting: (v: boolean) => void
  reset: () => void
}

const defaults = {
  amount: '',
  title: '',
  paidBy: null,
  participants: [],
  splitType: 'equally' as SplitType,
  exactAmounts: {},
  percentages: {},
  isSubmitting: false,
}

export const useAddExpenseStore = create<AddExpenseState>((set, get) => ({
  ...defaults,
  setAmount: v => set({ amount: v }),
  setTitle: v => set({ title: v }),
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

  setSplitType: t => set({ splitType: t }),
  setExactAmount: (userId, val) =>
    set(s => ({ exactAmounts: { ...s.exactAmounts, [userId]: val } })),
  setPercentage: (userId, val) => set(s => ({ percentages: { ...s.percentages, [userId]: val } })),
  setSubmitting: v => set({ isSubmitting: v }),
  reset: () => set(defaults),
}))
