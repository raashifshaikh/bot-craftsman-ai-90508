export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bot_analytics: {
        Row: {
          created_at: string | null
          id: string
          metric_date: string | null
          metric_name: string
          metric_value: number | null
          project_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          metric_date?: string | null
          metric_name: string
          metric_value?: number | null
          project_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          metric_date?: string | null
          metric_name?: string
          metric_value?: number | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bot_analytics_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bot_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_commands: {
        Row: {
          command: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          project_id: string
          response_content: string
          response_metadata: Json | null
          response_type: string | null
          updated_at: string | null
        }
        Insert: {
          command: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          project_id: string
          response_content: string
          response_metadata?: Json | null
          response_type?: string | null
          updated_at?: string | null
        }
        Update: {
          command?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          project_id?: string
          response_content?: string
          response_metadata?: Json | null
          response_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_commands_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bot_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_messages: {
        Row: {
          bot_response: string | null
          created_at: string | null
          id: string
          message_text: string | null
          message_type: string | null
          project_id: string
          response_time_ms: number | null
          telegram_first_name: string | null
          telegram_last_name: string | null
          telegram_user_id: string
          telegram_username: string | null
        }
        Insert: {
          bot_response?: string | null
          created_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          project_id: string
          response_time_ms?: number | null
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_user_id: string
          telegram_username?: string | null
        }
        Update: {
          bot_response?: string | null
          created_at?: string | null
          id?: string
          message_text?: string | null
          message_type?: string | null
          project_id?: string
          response_time_ms?: number | null
          telegram_first_name?: string | null
          telegram_last_name?: string | null
          telegram_user_id?: string
          telegram_username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bot_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bot_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      bot_projects: {
        Row: {
          bot_status: string | null
          bot_username: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean | null
          name: string
          supabase_anon_key: string | null
          supabase_url: string | null
          telegram_bot_token: string | null
          updated_at: string
          user_id: string | null
          webhook_url: string | null
        }
        Insert: {
          bot_status?: string | null
          bot_username?: string | null
          created_at?: string
          description: string
          id?: string
          is_active?: boolean | null
          name: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          telegram_bot_token?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          bot_status?: string | null
          bot_username?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean | null
          name?: string
          supabase_anon_key?: string | null
          supabase_url?: string | null
          telegram_bot_token?: string | null
          updated_at?: string
          user_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      generated_code: {
        Row: {
          created_at: string
          file_content: string
          file_name: string
          file_type: string
          id: string
          project_id: string
          version: number
        }
        Insert: {
          created_at?: string
          file_content: string
          file_name: string
          file_type: string
          id?: string
          project_id: string
          version?: number
        }
        Update: {
          created_at?: string
          file_content?: string
          file_name?: string
          file_type?: string
          id?: string
          project_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_code_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bot_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_history: {
        Row: {
          ai_response: Json | null
          created_at: string
          id: string
          project_id: string
          status: string
          user_prompt: string
        }
        Insert: {
          ai_response?: Json | null
          created_at?: string
          id?: string
          project_id: string
          status?: string
          user_prompt: string
        }
        Update: {
          ai_response?: Json | null
          created_at?: string
          id?: string
          project_id?: string
          status?: string
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "bot_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_bot_metric: {
        Args: {
          p_increment?: number
          p_metric_name: string
          p_project_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
