import type { ImageSourcePropType } from 'react-native'

export type BalanceType = 'owes_you' | 'you_owe' | 'settled'

export interface Friend {
  id: string
  name: string
  avatar: ImageSourcePropType | null // Can be a local image (require) or a remote URL
  subtitle: string
  subtitleType?: 'default' | 'alert' | 'upcoming'
  balanceType: BalanceType
  amount: number
}

export interface GroupMember {
  name: string
  amount: number
  balanceType: BalanceType
}

export interface Group {
  id: string
  name: string
  avatar: ImageSourcePropType | null
  emoji?: string
  balanceType: BalanceType
  amount: number
  members?: GroupMember[]
}

export type FilterOption = 'none' | 'outstanding' | 'owes_you' | 'you_owe'

// Also switched double quotes to single quotes to match your .prettierrc.
