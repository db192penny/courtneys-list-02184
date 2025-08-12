export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      approved_households: {
        Row: {
          approved_at: string
          approved_by: string
          hoa_name: string
          household_address: string
        }
        Insert: {
          approved_at?: string
          approved_by: string
          hoa_name: string
          household_address: string
        }
        Update: {
          approved_at?: string
          approved_by?: string
          hoa_name?: string
          household_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "approved_households_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      costs: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          household_address: string
          id: string
          normalized_address: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          household_address: string
          id?: string
          normalized_address: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          household_address?: string
          id?: string
          normalized_address?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "costs_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      hoa_admins: {
        Row: {
          hoa_name: string
          user_id: string
        }
        Insert: {
          hoa_name: string
          user_id: string
        }
        Update: {
          hoa_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hoa_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      household_hoa: {
        Row: {
          created_at: string
          created_by: string | null
          hoa_name: string
          household_address: string
          id: string
          normalized_address: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hoa_name: string
          household_address: string
          id?: string
          normalized_address: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hoa_name?: string
          household_address?: string
          id?: string
          normalized_address?: string
          updated_at?: string
        }
        Relationships: []
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invite_token: string
          invited_by: string | null
          invited_email: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_token: string
          invited_by?: string | null
          invited_email?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invite_token?: string
          invited_by?: string | null
          invited_email?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comments: string | null
          created_at: string | null
          id: string
          rating: number
          recommended: boolean | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          comments?: string | null
          created_at?: string | null
          id?: string
          rating: number
          recommended?: boolean | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          comments?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          recommended?: boolean | null
          user_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      users: {
        Row: {
          address: string
          badges: string[] | null
          created_at: string | null
          email: string
          formatted_address: string | null
          google_place_id: string | null
          id: string
          invited_by: string | null
          is_anonymous: boolean | null
          is_verified: boolean | null
          name: string | null
          points: number | null
          show_name_public: boolean | null
          street_name: string
          submissions_count: number | null
          updated_at: string
        }
        Insert: {
          address: string
          badges?: string[] | null
          created_at?: string | null
          email: string
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          invited_by?: string | null
          is_anonymous?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          points?: number | null
          show_name_public?: boolean | null
          street_name: string
          submissions_count?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          badges?: string[] | null
          created_at?: string | null
          email?: string
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          invited_by?: string | null
          is_anonymous?: boolean | null
          is_verified?: boolean | null
          name?: string | null
          points?: number | null
          show_name_public?: boolean | null
          street_name?: string
          submissions_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string
          community: string | null
          contact_info: string
          created_at: string | null
          created_by: string | null
          google_place_id: string | null
          id: string
          name: string
          typical_cost: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          community?: string | null
          contact_info: string
          created_at?: string | null
          created_by?: string | null
          google_place_id?: string | null
          id?: string
          name: string
          typical_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          community?: string | null
          contact_info?: string
          created_at?: string | null
          created_by?: string | null
          google_place_id?: string | null
          id?: string
          name?: string
          typical_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_approve_household: {
        Args: { _addr: string }
        Returns: {
          approved: boolean
          address: string
          hoa_name: string
        }[]
      }
      admin_list_pending_households: {
        Args: Record<PropertyKey, never>
        Returns: {
          household_address: string
          hoa_name: string
          first_seen: string
        }[]
      }
      admin_list_pending_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          id: string
          email: string
          name: string
          is_verified: boolean
          created_at: string
        }[]
      }
      admin_set_user_verification: {
        Args: { _user_id: string; _is_verified: boolean }
        Returns: {
          id: string
          is_verified: boolean
        }[]
      }
      count_my_costs: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      current_user_normalized_address: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_email_status: {
        Args: { _email: string }
        Returns: string
      }
      get_my_hoa: {
        Args: Record<PropertyKey, never>
        Returns: {
          hoa_name: string
        }[]
      }
      has_role: {
        Args: {
          _user_id: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_household_approved: {
        Args: { _addr: string }
        Returns: boolean
      }
      is_user_approved: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_user_hoa_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_verified: {
        Args: { _uid: string }
        Returns: boolean
      }
      mark_invite_accepted: {
        Args: { _token: string; _user_id: string }
        Returns: boolean
      }
      normalize_address: {
        Args: { _addr: string }
        Returns: string
      }
      validate_invite: {
        Args: { _token: string }
        Returns: {
          invite_id: string
          invited_email: string
          status: string
          accepted: boolean
          created_at: string
        }[]
      }
      vendor_cost_stats: {
        Args: { _vendor_id: string; _hoa_name: string }
        Returns: {
          avg_amount: number
          sample_size: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
