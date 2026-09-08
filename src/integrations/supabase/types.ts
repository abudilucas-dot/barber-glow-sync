export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      appointments: {
        Row: {
          barber_id: string;
          client_id: string;
          created_at: string;
          date: string;
          id: string;
          service: string;
          shop_id: string | null;
          status: Database["public"]["Enums"]["appointment_status"];
          time: string;
        };
        Insert: {
          barber_id: string;
          client_id: string;
          created_at?: string;
          date: string;
          id?: string;
          service: string;
          shop_id?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          time: string;
        };
        Update: {
          barber_id?: string;
          client_id?: string;
          created_at?: string;
          date?: string;
          id?: string;
          service?: string;
          shop_id?: string | null;
          status?: Database["public"]["Enums"]["appointment_status"];
          time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "appointments_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbers: {
        Row: {
          created_at: string;
          bio: string;
          active: boolean;
          id: string;
          name: string;
          photo_url: string | null;
          shop_id: string | null;
          specialty: string;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          bio?: string;
          active?: boolean;
          id?: string;
          name: string;
          photo_url?: string | null;
          shop_id?: string | null;
          specialty?: string;
          whatsapp: string;
        };
        Update: {
          created_at?: string;
          bio?: string;
          active?: boolean;
          id?: string;
          name?: string;
          photo_url?: string | null;
          shop_id?: string | null;
          specialty?: string;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      barbershops: {
        Row: {
          address: string | null;
          address_number: string | null;
          about: string;
          booking_max_future_days: number;
          booking_min_advance_minutes: number;
          city: string | null;
          created_at: string;
          hero_url: string | null;
          id: string;
          instagram_url: string | null;
          maps_url: string | null;
          name: string;
          owner_id: string;
          owner_whatsapp: string;
          neighborhood: string | null;
          postal_code: string | null;
          plan: string;
          primary_color: string;
          slug: string;
          status: string;
          state: string | null;
          tagline: string;
          trial_ends_at: string;
          updated_at: string;
          latitude: number | null;
          longitude: number | null;
        };
        Insert: {
          address?: string | null;
          address_number?: string | null;
          about?: string;
          booking_max_future_days?: number;
          booking_min_advance_minutes?: number;
          city?: string | null;
          created_at?: string;
          hero_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          maps_url?: string | null;
          name: string;
          owner_id: string;
          owner_whatsapp?: string;
          neighborhood?: string | null;
          postal_code?: string | null;
          plan?: string;
          primary_color?: string;
          slug: string;
          status?: string;
          state?: string | null;
          tagline?: string;
          trial_ends_at?: string;
          updated_at?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        Update: {
          address?: string | null;
          address_number?: string | null;
          about?: string;
          booking_max_future_days?: number;
          booking_min_advance_minutes?: number;
          city?: string | null;
          created_at?: string;
          hero_url?: string | null;
          id?: string;
          instagram_url?: string | null;
          maps_url?: string | null;
          name?: string;
          owner_id?: string;
          owner_whatsapp?: string;
          neighborhood?: string | null;
          postal_code?: string | null;
          plan?: string;
          primary_color?: string;
          slug?: string;
          status?: string;
          state?: string | null;
          tagline?: string;
          trial_ends_at?: string;
          updated_at?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          shop_id: string | null;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          shop_id?: string | null;
          whatsapp: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          shop_id?: string | null;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "clients_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_hours: {
        Row: {
          created_at: string;
          days: string;
          hours: string;
          id: string;
          shop_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          days: string;
          hours: string;
          id?: string;
          shop_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          days?: string;
          hours?: string;
          id?: string;
          shop_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_hours_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      shop_services: {
        Row: {
          created_at: string;
          active: boolean;
          category: string;
          description: string;
          duration: string;
          duration_minutes: number;
          id: string;
          name: string;
          price: number;
          shop_id: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          active?: boolean;
          category?: string;
          description?: string;
          duration?: string;
          duration_minutes?: number;
          id?: string;
          name: string;
          price?: number;
          shop_id: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          active?: boolean;
          category?: string;
          description?: string;
          duration?: string;
          duration_minutes?: number;
          id?: string;
          name?: string;
          price?: number;
          shop_id?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shop_services_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          environment: string;
          id: string;
          price_id: string | null;
          product_id: string | null;
          shop_id: string | null;
          status: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          environment?: string;
          id?: string;
          price_id?: string | null;
          product_id?: string | null;
          shop_id?: string | null;
          status?: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          environment?: string;
          id?: string;
          price_id?: string | null;
          product_id?: string | null;
          shop_id?: string | null;
          status?: string;
          stripe_customer_id?: string;
          stripe_subscription_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "barbershops";
            referencedColumns: ["id"];
          },
        ];
      };
      subscription_events: {
        Row: {
          environment: string;
          event_type: string;
          received_at: string;
          stripe_event_id: string;
        };
        Insert: {
          environment: string;
          event_type: string;
          received_at?: string;
          stripe_event_id: string;
        };
        Update: {
          environment?: string;
          event_type?: string;
          received_at?: string;
          stripe_event_id?: string;
        };
        Relationships: [];
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
      create_booking: {
        Args: {
          _barber_id: string | null;
          _client_name: string;
          _client_phone: string;
          _date: string;
          _service_id: string;
          _shop_id: string;
          _start_time: string;
        };
        Returns: {
          appointment_id: string;
          barber_id: string;
          end_time: string;
          start_time: string;
          status: Database["public"]["Enums"]["appointment_status"];
        }[];
      };
      cancel_appointment: {
        Args: { _appointment_id: string };
        Returns: Database["public"]["Tables"]["appointments"]["Row"];
      };
      get_available_slots: {
        Args: { _barber_id?: string | null; _date: string; _service_id: string; _shop_id: string };
        Returns: { barber_id: string; end_time: string; start_time: string }[];
      };
      get_booked_slots:
        | {
            Args: { _from?: string; _to?: string };
            Returns: {
              barber_id: string;
              date: string;
              time: string;
            }[];
          }
        | {
            Args: { _from?: string; _shop_id: string; _to?: string };
            Returns: {
              barber_id: string;
              date: string;
              time: string;
            }[];
          };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_shop_owner: {
        Args: { _shop_id: string; _user_id: string };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      initialize_barber_schedule: { Args: { _barber_id: string }; Returns: undefined };
      initialize_shop_schedule: { Args: { _shop_id: string }; Returns: undefined };
      update_shop_profile: {
        Args: {
          _about: string;
          _hero_url: string;
          _instagram_url: string;
          _maps_url: string;
          _name: string;
          _owner_whatsapp: string;
          _shop_id: string;
          _slug: string;
          _tagline: string;
          _address?: string | null;
          _address_number?: string | null;
          _city?: string | null;
          _latitude?: number | null;
          _longitude?: number | null;
          _neighborhood?: string | null;
          _postal_code?: string | null;
          _state?: string | null;
        };
        Returns: Database["public"]["Tables"]["barbershops"]["Row"];
      };
      upsert_client: {
        Args: { _name: string; _shop_id: string; _whatsapp: string };
        Returns: string;
      };
    };
    Enums: {
      app_role: "admin" | "staff";
      appointment_status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
    },
  },
} as const;
