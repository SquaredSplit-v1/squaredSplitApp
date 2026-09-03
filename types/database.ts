export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_feed: {
        Row: {
          created_at: string
          id: number
          metadata: Json
          seen: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          metadata?: Json
          seen?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          metadata?: Json
          seen?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_feed_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string | null
          id: string
          platform: string | null
          token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string | null
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'device_tokens_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expense_participants: {
        Row: {
          created_at: string | null
          expense_id: string
          id: string
          is_settled: boolean | null
          share_amount: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expense_id: string
          id?: string
          is_settled?: boolean | null
          share_amount: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expense_id?: string
          id?: string
          is_settled?: boolean | null
          share_amount?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_participants_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
        ]
      }
      expense_rejections: {
        Row: {
          created_at: string
          expense_id: string
          id: string
          other_text: string | null
          reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expense_id: string
          id?: string
          other_text?: string | null
          reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          expense_id?: string
          id?: string
          other_text?: string | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_rejections_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'expense_rejections_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string
          description: string
          due_date: string | null
          group_id: string | null
          id: string
          note: string | null
          paid_by: string
          split_type: Database['public']['Enums']['split_type'] | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by: string
          description: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          note?: string | null
          paid_by: string
          split_type?: Database['public']['Enums']['split_type'] | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          due_date?: string | null
          group_id?: string | null
          id?: string
          note?: string | null
          paid_by?: string
          split_type?: Database['public']['Enums']['split_type'] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friend_notes: {
        Row: {
          friend_id: string
          note: string
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          friend_id: string
          note?: string
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          friend_id?: string
          note?: string
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'friend_notes_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_notes_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      friend_settings: {
        Row: {
          friend_id: string
          muted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          friend_id: string
          muted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          friend_id?: string
          muted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'friend_settings_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      group_members: {
        Row: {
          created_at: string | null
          group_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey'
            columns: ['group_id']
            isOneToOne: false
            referencedRelation: 'groups'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'group_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          emoji: string | null
          id: string
          name: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          emoji?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      otp_rate_limits: {
        Row: {
          attempt_count: number
          last_attempt: string
          locked_until: string | null
          phone: string
          window_start: string
        }
        Insert: {
          attempt_count?: number
          last_attempt?: string
          locked_until?: string | null
          phone: string
          window_start?: string
        }
        Update: {
          attempt_count?: number
          last_attempt?: string
          locked_until?: string | null
          phone?: string
          window_start?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          full_name: string | null
          has_onboarded: boolean
          id: string
          is_pro: boolean | null
          language: string | null
          onboarding_complete: boolean | null
          phone: string | null
          push_token: string | null
          squared_at: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          has_onboarded?: boolean
          id: string
          is_pro?: boolean | null
          language?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          push_token?: string | null
          squared_at?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          has_onboarded?: boolean
          id?: string
          is_pro?: boolean | null
          language?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          push_token?: string | null
          squared_at?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_notification_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      supported_currencies: {
        Row: {
          code: string
          decimal_digits: number
          locale: string
          name: string
          symbol: string
        }
        Insert: {
          code: string
          decimal_digits?: number
          locale: string
          name: string
          symbol: string
        }
        Update: {
          code?: string
          decimal_digits?: number
          locale?: string
          name?: string
          symbol?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_group_members: {
        Args: { p_group_id: string; p_member_ids: string[] }
        Returns: undefined
      }
      calculate_balance: {
        Args: { current_user_id: string }
        Returns: {
          friend_id: string
          net_amount: number
        }[]
      }
      create_expense_equal: {
        Args: {
          p_amount: number
          p_category: string
          p_created_by: string
          p_date: string
          p_due_date: string
          p_group_id: string
          p_note: string
          p_paid_by: string
          p_participants: string[]
          p_title: string
        }
        Returns: Json
      }
      create_expense_with_splits: {
        Args: {
          p_amount: number
          p_category: string
          p_created_by: string
          p_date: string
          p_due_date: string
          p_group_id: string
          p_note: string
          p_paid_by: string
          p_split_type?: string
          p_splits: Json
          p_title: string
        }
        Returns: Json
      }
      create_group: {
        Args: { p_emoji?: string; p_member_ids?: string[]; p_name: string }
        Returns: Json
      }
      friend_notes_pair_key: {
        Args: { p_a: string; p_b: string }
        Returns: string[]
      }
      get_friend_balances: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          friend_id: string
          full_name: string
          net_balance: number
        }[]
      }
      get_friends_overview: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string
          expense_count: number
          friend_id: string
          full_name: string
          has_overdue: boolean
          last_activity_at: string
          net_balance: number
          next_due_date: string
        }[]
      }
      get_shared_expenses: {
        Args: { p_friend_id: string; p_user_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          expense_id: string
          is_settled: boolean
          paid_by: string
          share_amount: number
        }[]
      }
      is_expense_participant: {
        Args: { p_expense_id: string }
        Returns: boolean
      }
      is_group_member: { Args: { p_group_id: string }; Returns: boolean }
      mark_activity_feed_seen: {
        Args: { p_activity_ids?: number[]; p_user_id: string }
        Returns: number
      }
      match_contacts: {
        Args: { phone_numbers: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          phone: string
        }[]
      }
      normalize_phone_e164_like: { Args: { p_phone: string }; Returns: string }
      reject_expense: {
        Args: { p_expense_id: string; p_other_text?: string; p_reason: string }
        Returns: undefined
      }
      settle_up_with_friend: { Args: { p_friend_id: string }; Returns: Json }
      upsert_friend_note: {
        Args: { p_friend_id: string; p_note: string }
        Returns: undefined
      }
    }
    Enums: {
      split_type: 'equal' | 'exact' | 'percentage'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      split_type: ['equal', 'exact', 'percentage'],
    },
  },
} as const
