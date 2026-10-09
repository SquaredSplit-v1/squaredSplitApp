import { create } from 'zustand'

/**
 * A user scanned via QR code ("Scan code" on the Account tab) that the Home
 * screen should pre-open the Add Expense flow with. Mirrors pendingInviteStore.
 */
interface PendingSplitState {
  userId: string | null
  name: string | null
  set: (userId: string, name: string | null) => void
  clear: () => void
}

export const usePendingSplitStore = create<PendingSplitState>(set => ({
  userId: null,
  name: null,
  set: (userId, name) => set({ userId, name }),
  clear: () => set({ userId: null, name: null }),
}))
