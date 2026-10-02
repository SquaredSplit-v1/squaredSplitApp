/**
 * WhatsApp invite helpers. Invite links point at the `invite` Edge Function,
 * which serves a landing page that deep-links into the app
 * (squaredsplit://invite?token=...) with an app-store fallback for people
 * who don't have SquaredSplit installed yet.
 */

import { SUPABASE_URL } from '@/lib/env'

export function inviteLink(inviteId: string): string {
  return `${SUPABASE_URL}/functions/v1/invite?id=${inviteId}`
}

export function whatsappUrl(phoneE164: string, message: string): string {
  // wa.me expects the number in international format WITHOUT the leading +.
  const digits = phoneE164.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function expenseInviteMessage(input: {
  inviterName: string
  expenseTitle: string
  amountLabel: string
  shareLabel: string
  link: string
}): string {
  return [
    `${input.inviterName} invited you to split "${input.expenseTitle}" (${input.amountLabel}) on SquaredSplit.`,
    `Your share: ${input.shareLabel}`,
    ``,
    `Tap to accept: ${input.link}`,
  ].join('\n')
}

export function appInviteMessage(inviterName: string): string {
  return `${inviterName} is splitting expenses on SquaredSplit — install the app and add them as a friend! 🧾`
}
