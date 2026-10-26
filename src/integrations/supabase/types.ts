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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          event: string
          id: string
          props: Json
          session_id: string | null
          surface: string | null
          tab: string | null
          user_id: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          props?: Json
          session_id?: string | null
          surface?: string | null
          tab?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          props?: Json
          session_id?: string | null
          surface?: string | null
          tab?: string | null
          user_id?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          category: Database["public"]["Enums"]["banner_category"]
          created_at: string
          expires_at: string | null
          id: string
          image_url: string
          publish_at: string | null
          sort_order: number
          title: string | null
        }
        Insert: {
          active?: boolean
          category?: Database["public"]["Enums"]["banner_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url: string
          publish_at?: string | null
          sort_order?: number
          title?: string | null
        }
        Update: {
          active?: boolean
          category?: Database["public"]["Enums"]["banner_category"]
          created_at?: string
          expires_at?: string | null
          id?: string
          image_url?: string
          publish_at?: string | null
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      channel_aliases: {
        Row: {
          alias: string
          alias_normalized: string
          created_at: string
          id: string
          mapping_id: string
        }
        Insert: {
          alias: string
          alias_normalized: string
          created_at?: string
          id?: string
          mapping_id: string
        }
        Update: {
          alias?: string
          alias_normalized?: string
          created_at?: string
          id?: string
          mapping_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_aliases_mapping_id_fkey"
            columns: ["mapping_id"]
            isOneToOne: false
            referencedRelation: "channel_logo_mappings"
            referencedColumns: ["id"]
          },
        ]
      }
      channel_logo_mappings: {
        Row: {
          active: boolean
          channel_type: string
          created_at: string
          custom_logo_url: string | null
          id: string
          light_chip: boolean
          logo_key: string
          name: string
          name_normalized: string
          primary_color: string | null
          short: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          channel_type?: string
          created_at?: string
          custom_logo_url?: string | null
          id?: string
          light_chip?: boolean
          logo_key?: string
          name: string
          name_normalized: string
          primary_color?: string | null
          short?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          channel_type?: string
          created_at?: string
          custom_logo_url?: string | null
          id?: string
          light_chip?: boolean
          logo_key?: string
          name?: string
          name_normalized?: string
          primary_color?: string | null
          short?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_banner: {
        Row: {
          active: boolean
          created_at: string
          date: string
          id: string
          image_url: string
          link_url: string | null
          sort_order: number
          title: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          date: string
          id?: string
          image_url: string
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          date?: string
          id?: string
          image_url?: string
          link_url?: string | null
          sort_order?: number
          title?: string | null
        }
        Relationships: []
      }
      daily_games: {
        Row: {
          active: boolean
          api_payload_summary: Json | null
          api_status: string | null
          archived: boolean
          away_score: number | null
          away_team: string
          broadcast_country: string | null
          channels: string[] | null
          competition: string
          competition_detail: string | null
          created_at: string
          date: string
          elapsed_minutes: number | null
          external_id: string | null
          external_source: string | null
          external_sport: string | null
          game_time: string
          home_score: number | null
          home_team: string
          id: string
          is_live: boolean
          is_womens: boolean
          last_api_sync_at: string | null
          live_clock: string | null
          live_status: string | null
          live_updated_at: string | null
          period: string | null
          publish_at: string | null
          source: string
          sport_type: string
          status_short: string
        }
        Insert: {
          active?: boolean
          api_payload_summary?: Json | null
          api_status?: string | null
          archived?: boolean
          away_score?: number | null
          away_team: string
          broadcast_country?: string | null
          channels?: string[] | null
          competition?: string
          competition_detail?: string | null
          created_at?: string
          date?: string
          elapsed_minutes?: number | null
          external_id?: string | null
          external_source?: string | null
          external_sport?: string | null
          game_time: string
          home_score?: number | null
          home_team: string
          id?: string
          is_live?: boolean
          is_womens?: boolean
          last_api_sync_at?: string | null
          live_clock?: string | null
          live_status?: string | null
          live_updated_at?: string | null
          period?: string | null
          publish_at?: string | null
          source?: string
          sport_type?: string
          status_short?: string
        }
        Update: {
          active?: boolean
          api_payload_summary?: Json | null
          api_status?: string | null
          archived?: boolean
          away_score?: number | null
          away_team?: string
          broadcast_country?: string | null
          channels?: string[] | null
          competition?: string
          competition_detail?: string | null
          created_at?: string
          date?: string
          elapsed_minutes?: number | null
          external_id?: string | null
          external_source?: string | null
          external_sport?: string | null
          game_time?: string
          home_score?: number | null
          home_team?: string
          id?: string
          is_live?: boolean
          is_womens?: boolean
          last_api_sync_at?: string | null
          live_clock?: string | null
          live_status?: string | null
          live_updated_at?: string | null
          period?: string | null
          publish_at?: string | null
          source?: string
          sport_type?: string
          status_short?: string
        }
        Relationships: []
      }
      featured_movies: {
        Row: {
          active: boolean
          added_by: string | null
          backdrop_url: string | null
          created_at: string
          genre: string | null
          id: string
          overview: string | null
          poster_url: string | null
          rating: number | null
          sort_order: number
          title: string
          tmdb_id: number
          year: number | null
        }
        Insert: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          overview?: string | null
          poster_url?: string | null
          rating?: number | null
          sort_order?: number
          title: string
          tmdb_id: number
          year?: number | null
        }
        Update: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          overview?: string | null
          poster_url?: string | null
          rating?: number | null
          sort_order?: number
          title?: string
          tmdb_id?: number
          year?: number | null
        }
        Relationships: []
      }
      featured_series: {
        Row: {
          active: boolean
          added_by: string | null
          backdrop_url: string | null
          created_at: string
          genre: string | null
          id: string
          overview: string | null
          poster_url: string | null
          rating: number | null
          sort_order: number
          title: string
          tmdb_id: number
          year: number | null
        }
        Insert: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          overview?: string | null
          poster_url?: string | null
          rating?: number | null
          sort_order?: number
          title: string
          tmdb_id: number
          year?: number | null
        }
        Update: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          created_at?: string
          genre?: string | null
          id?: string
          overview?: string | null
          poster_url?: string | null
          rating?: number | null
          sort_order?: number
          title?: string
          tmdb_id?: number
          year?: number | null
        }
        Relationships: []
      }
      games: {
        Row: {
          active: boolean
          away_logo: string | null
          away_team: string
          channel: string | null
          competition: string
          created_at: string
          date: string
          home_logo: string | null
          home_team: string
          id: string
          time: string
        }
        Insert: {
          active?: boolean
          away_logo?: string | null
          away_team: string
          channel?: string | null
          competition?: string
          created_at?: string
          date?: string
          home_logo?: string | null
          home_team: string
          id?: string
          time: string
        }
        Update: {
          active?: boolean
          away_logo?: string | null
          away_team?: string
          channel?: string | null
          competition?: string
          created_at?: string
          date?: string
          home_logo?: string | null
          home_team?: string
          id?: string
          time?: string
        }
        Relationships: []
      }
      news_releases: {
        Row: {
          active: boolean
          added_by: string | null
          backdrop_url: string | null
          badge_type: string
          content_type: string
          created_at: string
          display_order: number
          genres: string | null
          id: string
          image_url: string | null
          overview: string | null
          rating: number | null
          runtime: number | null
          seasons: number | null
          tagline: string | null
          title: string
          tmdb_id: number | null
          year: number | null
        }
        Insert: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          badge_type?: string
          content_type?: string
          created_at?: string
          display_order?: number
          genres?: string | null
          id?: string
          image_url?: string | null
          overview?: string | null
          rating?: number | null
          runtime?: number | null
          seasons?: number | null
          tagline?: string | null
          title: string
          tmdb_id?: number | null
          year?: number | null
        }
        Update: {
          active?: boolean
          added_by?: string | null
          backdrop_url?: string | null
          badge_type?: string
          content_type?: string
          created_at?: string
          display_order?: number
          genres?: string | null
          id?: string
          image_url?: string | null
          overview?: string | null
          rating?: number | null
          runtime?: number | null
          seasons?: number | null
          tagline?: string | null
          title?: string
          tmdb_id?: number | null
          year?: number | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          game_ids: string[]
          id: string
          p256dh: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          game_ids?: string[]
          id?: string
          p256dh: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          game_ids?: string[]
          id?: string
          p256dh?: string
        }
        Relationships: []
      }
      schedule_publication_versions: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          dates: string[]
          game_count: number
          games: Json
          id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          dates?: string[]
          game_count?: number
          games?: Json
          id?: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          dates?: string[]
          game_count?: number
          games?: Json
          id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: string
          is_secret: boolean
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          is_secret?: boolean
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          id?: string
          is_secret?: boolean
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      sportsapi_suggestions: {
        Row: {
          api_status: string | null
          away_score: number | null
          away_team: string
          broadcast_country: string | null
          competition: string
          competition_country: string | null
          created_at: string
          date: string
          external_id: string
          game_time: string
          home_score: number | null
          home_team: string
          id: string
          imported_game_id: string | null
          live_clock: string | null
          matched_game_id: string | null
          normalized_channels: string[]
          payload: Json
          period: string | null
          review_status: string
          sport: string
          sport_type: string
          start_time: string
          status: string
          title: string | null
          tv_networks: Json
          updated_at: string
          warnings: Json
        }
        Insert: {
          api_status?: string | null
          away_score?: number | null
          away_team?: string
          broadcast_country?: string | null
          competition?: string
          competition_country?: string | null
          created_at?: string
          date: string
          external_id: string
          game_time: string
          home_score?: number | null
          home_team?: string
          id?: string
          imported_game_id?: string | null
          live_clock?: string | null
          matched_game_id?: string | null
          normalized_channels?: string[]
          payload?: Json
          period?: string | null
          review_status?: string
          sport: string
          sport_type?: string
          start_time: string
          status?: string
          title?: string | null
          tv_networks?: Json
          updated_at?: string
          warnings?: Json
        }
        Update: {
          api_status?: string | null
          away_score?: number | null
          away_team?: string
          broadcast_country?: string | null
          competition?: string
          competition_country?: string | null
          created_at?: string
          date?: string
          external_id?: string
          game_time?: string
          home_score?: number | null
          home_team?: string
          id?: string
          imported_game_id?: string | null
          live_clock?: string | null
          matched_game_id?: string | null
          normalized_channels?: string[]
          payload?: Json
          period?: string | null
          review_status?: string
          sport?: string
          sport_type?: string
          start_time?: string
          status?: string
          title?: string | null
          tv_networks?: Json
          updated_at?: string
          warnings?: Json
        }
        Relationships: []
      }
      sportsapi_sync_runs: {
        Row: {
          actor_id: string | null
          created_at: string
          date: string
          error_message: string | null
          id: string
          kind: string
          requests_used: number
          sports: string[]
          status: string
          total_duplicates: number
          total_found: number
          total_ignored_foreign: number
          total_ignored_no_transmission: number
          total_ready: number
          total_review: number
          total_updated: number
          total_with_transmission: number
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          date: string
          error_message?: string | null
          id?: string
          kind?: string
          requests_used?: number
          sports?: string[]
          status?: string
          total_duplicates?: number
          total_found?: number
          total_ignored_foreign?: number
          total_ignored_no_transmission?: number
          total_ready?: number
          total_review?: number
          total_updated?: number
          total_with_transmission?: number
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          date?: string
          error_message?: string | null
          id?: string
          kind?: string
          requests_used?: number
          sports?: string[]
          status?: string
          total_duplicates?: number
          total_found?: number
          total_ignored_foreign?: number
          total_ignored_no_transmission?: number
          total_ready?: number
          total_review?: number
          total_updated?: number
          total_with_transmission?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      activate_scheduled_content: { Args: never; Returns: undefined }
      add_push_game_id: {
        Args: { _endpoint: string; _game_id: string }
        Returns: undefined
      }
      check_alias_collision: {
        Args: { _alias: string; _exclude_mapping_id?: string }
        Returns: {
          collision_type: string
          conflicting_value: string
          mapping_id: string
          mapping_name: string
        }[]
      }
      cleanup_job_logs: { Args: never; Returns: undefined }
      cleanup_old_manual_schedules: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_channel_mappings: {
        Args: { _source_id: string; _target_id: string }
        Returns: number
      }
      remove_multiple_game_ids: {
        Args: { _endpoint: string; _ids: string[] }
        Returns: undefined
      }
      remove_push_game_id: {
        Args: { _endpoint: string; _game_id: string }
        Returns: undefined
      }
      reorder_channel_mappings: { Args: { _ids: string[] }; Returns: undefined }
      restore_schedule_publication_version: {
        Args: { _version_id: string }
        Returns: number
      }
      upsert_push_subscription: {
        Args: { _auth: string; _endpoint: string; _p256dh: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      banner_category:
        | "cover"
        | "football"
        | "basketball"
        | "ufc"
        | "other_sports"
        | "football_guide"
        | "athletics"
        | "motorsport"
        | "tennis"
        | "volleyball"
        | "futsal"
        | "boxing"
        | "mma"
        | "hockey"
        | "baseball"
        | "rugby"
        | "surf"
        | "cycling"
        | "swimming"
        | "golf"
        | "handball"
        | "esports"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      banner_category: [
        "cover",
        "football",
        "basketball",
        "ufc",
        "other_sports",
        "football_guide",
        "athletics",
        "motorsport",
        "tennis",
        "volleyball",
        "futsal",
        "boxing",
        "mma",
        "hockey",
        "baseball",
        "rugby",
        "surf",
        "cycling",
        "swimming",
        "golf",
        "handball",
        "esports",
      ],
    },
  },
} as const
