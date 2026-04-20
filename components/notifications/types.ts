import type { ImageSourcePropType } from 'react-native'

export interface NotificationRequest {
  id: string
  userName: string
  avatar: ImageSourcePropType
  amount: number
  /** "owed" = someone owes you, "you_owe" = you owe someone */
  type: 'owed' | 'you_owe'
  groupName: string
  timeAgo: string
}

export type RejectionReason = 'not_part_of_expense' | 'not_part_of_group' | 'already_paid' | 'other'

export const REJECTION_OPTIONS: { label: string; value: RejectionReason }[] = [
  { label: 'I was not part of this expense', value: 'not_part_of_expense' },
  { label: 'I am not part of this group', value: 'not_part_of_group' },
  { label: 'I have already paid for this', value: 'already_paid' },
  { label: 'Other', value: 'other' },
]
