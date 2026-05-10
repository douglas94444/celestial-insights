export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      charts: {
        Row: {
          aspects_data: Json;
          birth_date: string;
          birth_place: string;
          birth_time: string;
          birth_time_known: boolean;
          created_at: string;
          house_system: string;
          houses_data: Json;
          id: string;
          is_primary: boolean;
          latitude: number;
          longitude: number;
          name: string;
          planets_data: Json;
          timezone: string;
          timezone_offset_minutes: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          aspects_data?: Json;
          birth_date: string;
          birth_place: string;
          birth_time?: string;
          birth_time_known?: boolean;
          created_at?: string;
          house_system?: string;
          houses_data?: Json;
          id?: string;
          is_primary?: boolean;
          latitude: number;
          longitude: number;
          name: string;
          planets_data?: Json;
          timezone: string;
          timezone_offset_minutes?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          aspects_data?: Json;
          birth_date?: string;
          birth_place?: string;
          birth_time?: string;
          birth_time_known?: boolean;
          created_at?: string;
          house_system?: string;
          houses_data?: Json;
          id?: string;
          is_primary?: boolean;
          latitude?: number;
          longitude?: number;
          name?: string;
          planets_data?: Json;
          timezone?: string;
          timezone_offset_minutes?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      chart_preview_calc_events: {
        Row: {
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      interpretation_ai_cache: {
        Row: {
          id: string;
          user_id: string;
          kind: Database["public"]["Enums"]["interpretation_ai_kind"];
          fingerprint: string;
          chart_id: string | null;
          synastry_id: string | null;
          transit_date: string | null;
          prompt_version: string;
          model: string;
          content: string;
          tokens_in: number | null;
          tokens_out: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          kind: Database["public"]["Enums"]["interpretation_ai_kind"];
          fingerprint: string;
          chart_id?: string | null;
          synastry_id?: string | null;
          transit_date?: string | null;
          prompt_version?: string;
          model: string;
          content: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          kind?: Database["public"]["Enums"]["interpretation_ai_kind"];
          fingerprint?: string;
          chart_id?: string | null;
          synastry_id?: string | null;
          transit_date?: string | null;
          prompt_version?: string;
          model?: string;
          content?: string;
          tokens_in?: number | null;
          tokens_out?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "interpretation_ai_cache_chart_id_fkey";
            columns: ["chart_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "interpretation_ai_cache_synastry_id_fkey";
            columns: ["synastry_id"];
            isOneToOne: false;
            referencedRelation: "synastries";
            referencedColumns: ["id"];
          },
        ];
      };
      user_engagement_events: {
        Row: {
          id: string;
          user_id: string;
          route_key: string;
          topic_key: string | null;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          route_key: string;
          topic_key?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          route_key?: string;
          topic_key?: string | null;
          meta?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email_notifications: boolean;
          house_system: string;
          id: string;
          moment_daily_email: boolean;
          moment_last_visit_ymd: string | null;
          moment_streak: number;
          name: string | null;
          personalization_focus_areas: Json;
          personalization_gender: string | null;
          personalization_tone: string;
          stripe_customer_id: string | null;
          subscription_tier: Database["public"]["Enums"]["subscription_tier"];
          transit_digest_auto: boolean;
          transit_digest_hour: number;
          transit_digest_weekdays: number[];
          updated_at: string;
          zodiac: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email_notifications?: boolean;
          house_system?: string;
          id: string;
          moment_daily_email?: boolean;
          moment_last_visit_ymd?: string | null;
          moment_streak?: number;
          name?: string | null;
          personalization_focus_areas?: Json;
          personalization_gender?: string | null;
          personalization_tone?: string;
          stripe_customer_id?: string | null;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          transit_digest_auto?: boolean;
          transit_digest_hour?: number;
          transit_digest_weekdays?: number[];
          updated_at?: string;
          zodiac?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email_notifications?: boolean;
          house_system?: string;
          id?: string;
          moment_daily_email?: boolean;
          moment_last_visit_ymd?: string | null;
          moment_streak?: number;
          name?: string | null;
          personalization_focus_areas?: Json;
          personalization_gender?: string | null;
          personalization_tone?: string;
          stripe_customer_id?: string | null;
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"];
          transit_digest_auto?: boolean;
          transit_digest_hour?: number;
          transit_digest_weekdays?: number[];
          updated_at?: string;
          zodiac?: string;
        };
        Relationships: [];
      };
      synastries: {
        Row: {
          chart1_id: string;
          chart2_id: string;
          compatibility_data: Json;
          compatibility_score: number;
          created_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          chart1_id: string;
          chart2_id: string;
          compatibility_data?: Json;
          compatibility_score?: number;
          created_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          chart1_id?: string;
          chart2_id?: string;
          compatibility_data?: Json;
          compatibility_score?: number;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "synastries_chart1_id_fkey";
            columns: ["chart1_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "synastries_chart2_id_fkey";
            columns: ["chart2_id"];
            isOneToOne: false;
            referencedRelation: "charts";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      interpretation_ai_kind:
        | "natal_summary"
        | "natal_planet"
        | "synastry"
        | "transit_day"
        | "morning_deep"
        | "natal_essence"
        | "synastry_deep";
      subscription_tier: "FREE" | "PREMIUM";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      interpretation_ai_kind: [
        "natal_summary",
        "natal_planet",
        "synastry",
        "transit_day",
        "morning_deep",
        "natal_essence",
        "synastry_deep",
      ],
      subscription_tier: ["FREE", "PREMIUM"],
    },
  },
} as const;
