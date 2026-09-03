export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.1'
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
      expense_participants: {
        Row: {
          id: string
          expense_id: string
          user_id: string
          share_amount: number
          is_settled: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          expense_id: string
          user_id: string
          share_amount: number
          is_settled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          expense_id?: string
          user_id?: string
          share_amount?: number
          is_settled?: boolean | null
          created_at?: string | null
          updated_at?: string | null
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
      expenses: {
        Row: {
          id: string
          amount: number
          description: string
          paid_by: string
          group_id: string | null
          split_type: string | null
          created_by: string
          created_at: string
          updated_at: string | null
          due_date: string | null
          note: string | null
          category: string | null
        }
        Insert: {
          id?: string
          amount: number
          description: string
          paid_by: string
          group_id?: string | null
          split_type?: string | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
          due_date?: string | null
          note?: string | null
          category?: string | null
        }
        Update: {
          id?: string
          amount?: number
          description?: string
          paid_by?: string
          group_id?: string | null
          split_type?: string | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
          due_date?: string | null
          note?: string | null
          category?: string | null
        }
        Relationships: []
      }
      group_members: {
        Row: {
          group_id: string
          user_id: string
          created_at: string | null
        }
        Insert: {
          group_id: string
          user_id: string
          created_at?: string | null
        }
        Update: {
          group_id?: string
          user_id?: string
          created_at?: string | null
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
          id: string
          name: string
          emoji: string | null
          avatar_url: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          emoji?: string | null
          avatar_url?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          emoji?: string | null
          avatar_url?: string | null
          created_at?: string | null
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
          id: string
          has_onboarded: boolean | null
          is_pro: boolean | null
          language: string | null
          onboarding_complete: boolean | null
          phone: string | null
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
          id: string
          has_onboarded?: boolean | null
          is_pro?: boolean | null
          language?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
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
          id?: string
          has_onboarded?: boolean | null
          is_pro?: boolean | null
          language?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          squared_at?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      friend_notes: {
        Row: {
          user_id: string
          friend_id: string
          note: string
          updated_by: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          friend_id: string
          note?: string
          updated_by?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          friend_id?: string
          note?: string
          updated_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'friend_notes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_notes_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      friend_settings: {
        Row: {
          user_id: string
          friend_id: string
          muted: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          friend_id: string
          muted?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          friend_id?: string
          muted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'friend_settings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'friend_settings_friend_id_fkey'
            columns: ['friend_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      expense_rejections: {
        Row: {
          id: string
          user_id: string
          expense_id: string
          reason: string
          other_text: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          expense_id: string
          reason: string
          other_text?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          expense_id?: string
          reason?: string
          other_text?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'expense_rejections_expense_id_fkey'
            columns: ['expense_id']
            isOneToOne: false
            referencedRelation: 'expenses'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_friend_balances: {
        Args: {
          p_user_id: string
        }
        Returns: {
          friend_id: string
          full_name: string | null
          avatar_url: string | null
          net_balance: number
        }[]
      }
      get_shared_expenses: {
        Args: {
          p_user_id: string
          p_friend_id: string
        }
        Returns: {
          expense_id: string
          description: string
          amount: number
          paid_by: string
          share_amount: number
          is_settled: boolean
          created_at: string
        }[]
      }
      match_contacts: {
        Args: {
          phone_numbers: string[]
        }
        Returns: {
          id: string
          display_name: string
          phone: string
          avatar_url: string | null
        }[]
      }
      create_group: {
        Args: {
          p_name: string
          p_emoji?: string | null
          p_member_ids?: string[]
        }
        Returns: Record<string, unknown>[]
      }
      add_group_members: {
        Args: {
          p_group_id: string
          p_member_ids: string[]
        }
        Returns: undefined
      }
      get_friends_overview: {
        Args: {
          p_user_id: string
        }
        Returns: {
          friend_id: string
          full_name: string | null
          avatar_url: string | null
          net_balance: number
          expense_count: number
          last_activity_at: string | null
          has_overdue: boolean | null
          next_due_date: string | null
        }[]
      }
      settle_up_with_friend: {
        Args: {
          p_friend_id: string
        }
        Returns: Record<string, unknown>[]
      }
      upsert_friend_note: {
        Args: {
          p_friend_id: string
          p_note: string
        }
        Returns: undefined
      }
      reject_expense: {
        Args: {
          p_expense_id: string
          p_reason: string
          p_other_text?: string | null
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
