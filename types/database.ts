export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          phone: string | null
          display_name: string | null
          avatar_url: string | null
          currency_pref: string
          onboarding_done: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          phone?: string | null
          display_name?: string | null
          avatar_url?: string | null
          currency_pref?: string
          onboarding_done?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          phone?: string | null
          display_name?: string | null
          avatar_url?: string | null
          currency_pref?: string
          onboarding_done?: boolean
          updated_at?: string
        }
      }
    }
  }
}
