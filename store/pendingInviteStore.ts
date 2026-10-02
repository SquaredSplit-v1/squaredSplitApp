import { create } from 'zustand'

/**
 * Holds an invite token that must be processed after the user signs in.
 * Flow: deep link → /invite screen → user not signed in → stash token →
 * auth flow → root layout effect resumes → /invite?token=… again.
 */
interface PendingInviteState {
  token: string | null
  setToken: (t: string | null) => void
}

export const usePendingInviteStore = create<PendingInviteState>(set => ({
  token: null,
  setToken: t => set({ token: t }),
}))
