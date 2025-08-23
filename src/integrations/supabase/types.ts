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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      address_change_log: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          new_address: string | null
          new_street_name: string | null
          old_address: string | null
          old_street_name: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_address?: string | null
          new_street_name?: string | null
          old_address?: string | null
          old_street_name?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_address?: string | null
          new_street_name?: string | null
          old_address?: string | null
          old_street_name?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "address_change_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      address_change_requests: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          current_address: string
          current_normalized_address: string
          id: string
          metadata: Json | null
          reason: string | null
          rejection_reason: string | null
          requested_address: string
          requested_formatted_address: string | null
          requested_normalized_address: string
          requested_place_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_address: string
          current_normalized_address: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          rejection_reason?: string | null
          requested_address: string
          requested_formatted_address?: string | null
          requested_normalized_address: string
          requested_place_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          current_address?: string
          current_normalized_address?: string
          id?: string
          metadata?: Json | null
          reason?: string | null
          rejection_reason?: string | null
          requested_address?: string
          requested_formatted_address?: string | null
          requested_normalized_address?: string
          requested_place_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      address_mismatch_log: {
        Row: {
          created_at: string
          id: string
          normalized_address: string
          original_address: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          suggested_hoa: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          normalized_address: string
          original_address: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggested_hoa?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          normalized_address?: string
          original_address?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          suggested_hoa?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Relationships: []
      }
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
      badge_levels: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          min_points: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          min_points: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          min_points?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
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
      community_assets: {
        Row: {
          address_line: string | null
          contact_phone: string | null
          hoa_name: string
          photo_path: string | null
          total_homes: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_line?: string | null
          contact_phone?: string | null
          hoa_name: string
          photo_path?: string | null
          total_homes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_line?: string | null
          contact_phone?: string | null
          hoa_name?: string
          photo_path?: string | null
          total_homes?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      costs: {
        Row: {
          admin_modified: boolean | null
          admin_modified_at: string | null
          admin_modified_by: string | null
          amount: number
          anonymous: boolean
          cost_kind: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          deleted_by: string | null
          household_address: string
          id: string
          normalized_address: string
          notes: string | null
          period: string | null
          quantity: number | null
          unit: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          admin_modified?: boolean | null
          admin_modified_at?: string | null
          admin_modified_by?: string | null
          amount: number
          anonymous?: boolean
          cost_kind?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          household_address: string
          id?: string
          normalized_address: string
          notes?: string | null
          period?: string | null
          quantity?: number | null
          unit?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          admin_modified?: boolean | null
          admin_modified_at?: string | null
          admin_modified_by?: string | null
          amount?: number
          anonymous?: boolean
          cost_kind?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          deleted_by?: string | null
          household_address?: string
          id?: string
          normalized_address?: string
          notes?: string | null
          period?: string | null
          quantity?: number | null
          unit?: string | null
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
      home_vendors: {
        Row: {
          amount: number | null
          contact_override: string | null
          created_at: string
          currency: string
          id: string
          my_comments: string | null
          my_rating: number | null
          period: string
          share_review_public: boolean
          updated_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          amount?: number | null
          contact_override?: string | null
          created_at?: string
          currency?: string
          id?: string
          my_comments?: string | null
          my_rating?: number | null
          period?: string
          share_review_public?: boolean
          updated_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          amount?: number | null
          contact_override?: string | null
          created_at?: string
          currency?: string
          id?: string
          my_comments?: string | null
          my_rating?: number | null
          period?: string
          share_review_public?: boolean
          updated_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: []
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
          community_name: string | null
          community_slug: string | null
          created_at: string | null
          id: string
          invite_token: string
          invited_by: string | null
          invited_email: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          community_name?: string | null
          community_slug?: string | null
          created_at?: string | null
          id?: string
          invite_token: string
          invited_by?: string | null
          invited_email?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          community_name?: string | null
          community_slug?: string | null
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
      point_rewards: {
        Row: {
          activity: string
          created_at: string
          description: string | null
          id: string
          points: number
          updated_at: string
        }
        Insert: {
          activity: string
          created_at?: string
          description?: string | null
          id?: string
          points: number
          updated_at?: string
        }
        Update: {
          activity?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          updated_at?: string
        }
        Relationships: []
      }
      preview_costs: {
        Row: {
          amount: number
          anonymous: boolean
          cost_kind: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          period: string | null
          quantity: number | null
          session_id: string
          unit: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          anonymous?: boolean
          cost_kind?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          period?: string | null
          quantity?: number | null
          session_id: string
          unit?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          anonymous?: boolean
          cost_kind?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          period?: string | null
          quantity?: number | null
          session_id?: string
          unit?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_costs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "preview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_links: {
        Row: {
          community: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          community: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          community?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      preview_metrics: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          session_id: string | null
          vendor_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preview_metrics_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "preview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_reviews: {
        Row: {
          anonymous: boolean
          comments: string | null
          created_at: string | null
          id: string
          rating: number
          recommended: boolean | null
          session_id: string
          vendor_id: string
        }
        Insert: {
          anonymous?: boolean
          comments?: string | null
          created_at?: string | null
          id?: string
          rating: number
          recommended?: boolean | null
          session_id: string
          vendor_id: string
        }
        Update: {
          anonymous?: boolean
          comments?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          recommended?: boolean | null
          session_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "preview_reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "preview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      preview_sessions: {
        Row: {
          address: string
          community: string
          created_at: string
          expires_at: string
          formatted_address: string | null
          google_place_id: string | null
          id: string
          name: string
          normalized_address: string
          session_token: string
          source: string | null
          street_name: string | null
        }
        Insert: {
          address: string
          community: string
          created_at?: string
          expires_at?: string
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          name: string
          normalized_address: string
          session_token: string
          source?: string | null
          street_name?: string | null
        }
        Update: {
          address?: string
          community?: string
          created_at?: string
          expires_at?: string
          formatted_address?: string | null
          google_place_id?: string | null
          id?: string
          name?: string
          normalized_address?: string
          session_token?: string
          source?: string | null
          street_name?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          anonymous: boolean
          comments: string | null
          created_at: string | null
          id: string
          rating: number
          recommended: boolean | null
          user_id: string | null
          vendor_id: string
        }
        Insert: {
          anonymous?: boolean
          comments?: string | null
          created_at?: string | null
          id?: string
          rating: number
          recommended?: boolean | null
          user_id?: string | null
          vendor_id: string
        }
        Update: {
          anonymous?: boolean
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
      user_point_history: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          points_earned: number
          related_id: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          points_earned: number
          related_id?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          points_earned?: number
          related_id?: string | null
          user_id?: string
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
          signup_source: string | null
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
          signup_source?: string | null
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
          signup_source?: string | null
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
      vendor_market_prices: {
        Row: {
          amount: number
          unit: string
          updated_at: string
          updated_by: string
          vendor_id: string
        }
        Insert: {
          amount: number
          unit: string
          updated_at?: string
          updated_by: string
          vendor_id: string
        }
        Update: {
          amount?: number
          unit?: string
          updated_at?: string
          updated_by?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_market_prices_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: true
            referencedRelation: "vendors"
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
          google_last_updated: string | null
          google_place_id: string | null
          google_rating: number | null
          google_rating_count: number | null
          google_reviews_json: Json | null
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
          google_last_updated?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          google_reviews_json?: Json | null
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
          google_last_updated?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_rating_count?: number | null
          google_reviews_json?: Json | null
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
          address: string
          approved: boolean
          hoa_name: string
        }[]
      }
      admin_check_missing_hoa_mappings: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          email: string
          missing_mapping: boolean
          signup_source: string
          user_id: string
        }[]
      }
      admin_cleanup_orphaned_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      admin_fix_address_mismatch: {
        Args: { _new_address: string; _new_hoa: string; _user_id: string }
        Returns: boolean
      }
      admin_list_address_mismatches: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          created_at: string
          email: string
          mismatch_status: string
          name: string
          normalized_address: string
          suggested_hoa: string
          user_id: string
        }[]
      }
      admin_list_all_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          address: string
          created_at: string
          email: string
          email_confirmed_at: string
          id: string
          is_orphaned: boolean
          is_verified: boolean
          name: string
          points: number
          signup_source: string
        }[]
      }
      admin_list_pending_households: {
        Args: Record<PropertyKey, never>
        Returns: {
          first_seen: string
          hoa_name: string
          household_address: string
        }[]
      }
      admin_list_pending_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          id: string
          is_verified: boolean
          name: string
        }[]
      }
      admin_set_user_verification: {
        Args: { _is_verified: boolean; _user_id: string }
        Returns: {
          id: string
          is_verified: boolean
        }[]
      }
      admin_soft_delete_user: {
        Args: { _reason?: string; _user_id: string }
        Returns: boolean
      }
      approve_address_change_request: {
        Args: { _admin_notes?: string; _request_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      audit_and_fix_user_points: {
        Args: Record<PropertyKey, never>
        Returns: {
          calculated_points: number
          cost_submissions: number
          old_points: number
          points_fixed: boolean
          reviews: number
          user_id: string
          vendor_submissions: number
        }[]
      }
      audit_user_points: {
        Args: Record<PropertyKey, never>
        Returns: {
          calculated_points: number
          cost_count: number
          current_points: number
          discrepancy: boolean
          history_points: number
          review_count: number
          user_email: string
          vendor_count: number
        }[]
      }
      backfill_missing_hoa_mappings: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          error_message: string
          fixed: boolean
          user_id: string
        }[]
      }
      check_orphaned_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          auth_created_at: string
          auth_email: string
          auth_user_id: string
          public_user_exists: boolean
        }[]
      }
      check_vendor_duplicate: {
        Args: { _community: string; _name: string }
        Returns: {
          vendor_category: string
          vendor_id: string
          vendor_name: string
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
      detect_address_mismatch: {
        Args: { _address: string; _user_id: string }
        Returns: string
      }
      fix_all_point_discrepancies: {
        Args: Record<PropertyKey, never>
        Returns: {
          fixed_user_email: string
          new_points: number
          old_points: number
        }[]
      }
      fix_duplicate_join_points: {
        Args: Record<PropertyKey, never>
        Returns: {
          new_points: number
          old_points: number
          removed_duplicates: number
          user_id: string
        }[]
      }
      fix_orphaned_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_record: boolean
          email: string
          error_message: string
          user_id: string
        }[]
      }
      fix_specific_orphaned_user: {
        Args: { _address?: string; _email: string; _name?: string }
        Returns: {
          created_record: boolean
          email: string
          error_message: string
          user_id: string
        }[]
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
      get_user_leaderboard_position: {
        Args: { _community_name: string; _user_id: string }
        Returns: {
          points: number
          rank_position: number
          total_users: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
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
      list_vendor_costs: {
        Args: { _vendor_id: string }
        Returns: {
          amount: number
          author_label: string
          cost_kind: string
          created_at: string
          id: string
          notes: string
          period: string
          unit: string
        }[]
      }
      list_vendor_reviews: {
        Args: { _vendor_id: string }
        Returns: {
          author_label: string
          comments: string
          created_at: string
          id: string
          rating: number
        }[]
      }
      list_vendor_stats: {
        Args: {
          _category?: string
          _hoa_name: string
          _limit?: number
          _offset?: number
          _sort_by?: string
        }
        Returns: {
          avg_cost_amount: number
          avg_cost_display: string
          avg_monthly_cost: number
          category: string
          community_amount: number
          community_sample_size: number
          community_unit: string
          contact_info: string
          google_place_id: string
          google_rating: number
          google_rating_count: number
          google_reviews_json: Json
          hoa_rating: number
          hoa_rating_count: number
          homes_pct: number
          homes_serviced: number
          id: string
          market_amount: number
          market_unit: string
          monthly_sample_size: number
          name: string
          service_call_avg: number
          service_call_sample_size: number
          typical_cost: number
        }[]
      }
      mark_invite_accepted: {
        Args: { _token: string; _user_id: string }
        Returns: boolean
      }
      monthlyize_cost: {
        Args: { _amount: number; _period: string }
        Returns: number
      }
      normalize_address: {
        Args: { _addr: string }
        Returns: string
      }
      reject_address_change_request: {
        Args: {
          _admin_notes?: string
          _rejection_reason: string
          _request_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      short_name: {
        Args: { full_name: string }
        Returns: string
      }
      slug_to_community_name: {
        Args: { _slug: string }
        Returns: string
      }
      street_only: {
        Args: { addr: string }
        Returns: string
      }
      validate_invite: {
        Args: { _token: string }
        Returns: {
          accepted: boolean
          community_name: string
          community_slug: string
          created_at: string
          invite_id: string
          invited_email: string
          status: string
        }[]
      }
      vendor_cost_stats: {
        Args: { _hoa_name: string; _vendor_id: string }
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
