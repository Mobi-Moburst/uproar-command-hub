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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      client_enrichment: {
        Row: {
          client_name: string
          competitors: string[]
          created_at: string
          health: string
          id: string
          industries: string[]
          keywords: string[]
          status_override: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          competitors?: string[]
          created_at?: string
          health?: string
          id?: string
          industries?: string[]
          keywords?: string[]
          status_override?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          competitors?: string[]
          created_at?: string
          health?: string
          id?: string
          industries?: string[]
          keywords?: string[]
          status_override?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_reports: {
        Row: {
          client_name: string
          created_at: string
          created_by: string | null
          curation_state: Json
          from_date: string | null
          id: string
          password_hash: string | null
          slug: string
          status: string
          title: string | null
          to_date: string | null
          updated_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          created_by?: string | null
          curation_state?: Json
          from_date?: string | null
          id?: string
          password_hash?: string | null
          slug?: string
          status?: string
          title?: string | null
          to_date?: string | null
          updated_at?: string
        }
        Update: {
          client_name?: string
          created_at?: string
          created_by?: string | null
          curation_state?: Json
          from_date?: string | null
          id?: string
          password_hash?: string | null
          slug?: string
          status?: string
          title?: string | null
          to_date?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      placements_archive: {
        Row: {
          ad_value: number
          client_name: string
          created_at: string
          date: string | null
          headline: string
          id: string
          link: string
          notes: string
          outlet: string
          readership_viewership: number
          reporter_name: string
          secured_by: string
          team_name: string
          topic_product: string
          type: string
          vertical: string
          weekly_wins_trigger: boolean
        }
        Insert: {
          ad_value?: number
          client_name?: string
          created_at?: string
          date?: string | null
          headline?: string
          id: string
          link?: string
          notes?: string
          outlet?: string
          readership_viewership?: number
          reporter_name?: string
          secured_by?: string
          team_name?: string
          topic_product?: string
          type?: string
          vertical?: string
          weekly_wins_trigger?: boolean
        }
        Update: {
          ad_value?: number
          client_name?: string
          created_at?: string
          date?: string | null
          headline?: string
          id?: string
          link?: string
          notes?: string
          outlet?: string
          readership_viewership?: number
          reporter_name?: string
          secured_by?: string
          team_name?: string
          topic_product?: string
          type?: string
          vertical?: string
          weekly_wins_trigger?: boolean
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      pulse_signals: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          client_name: string
          created_at: string
          dismissed: boolean
          generated_date: string
          headline: string
          hook: string
          id: string
          industry: string | null
          relevance_score: number
          source_url: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          client_name: string
          created_at?: string
          dismissed?: boolean
          generated_date?: string
          headline: string
          hook: string
          id?: string
          industry?: string | null
          relevance_score?: number
          source_url?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          client_name?: string
          created_at?: string
          dismissed?: boolean
          generated_date?: string
          headline?: string
          hook?: string
          id?: string
          industry?: string | null
          relevance_score?: number
          source_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
