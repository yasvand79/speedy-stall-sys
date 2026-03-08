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
      approval_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          remarks: string | null
          user_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          remarks?: string | null
          user_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          remarks?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      branch_menu_prices: {
        Row: {
          branch_id: string
          created_at: string
          id: string
          menu_item_id: string
          price: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          id?: string
          menu_item_id: string
          price: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          id?: string
          menu_item_id?: string
          price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_menu_prices_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_menu_prices_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          code: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          location: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          location?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          phone: string | null
          total_orders: number
          total_spent: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          phone?: string | null
          total_orders?: number
          total_spent?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          cost_per_unit: number
          created_at: string | null
          id: string
          last_restocked: string | null
          min_quantity: number
          name: string
          quantity: number
          unit: string
          updated_at: string | null
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          last_restocked?: string | null
          min_quantity?: number
          name: string
          quantity?: number
          unit: string
          updated_at?: string | null
        }
        Update: {
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          last_restocked?: string | null
          min_quantity?: number
          name?: string
          quantity?: number
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_logs: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          inventory_id: string
          order_id: string | null
          quantity_change: number
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id: string
          order_id?: string | null
          quantity_change: number
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          inventory_id?: string
          order_id?: string | null
          quantity_change?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_logs_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          branch_id: string | null
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          role_assigned: Database["public"]["Enums"]["app_role"]
          used_count: number
        }
        Insert: {
          branch_id?: string | null
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          role_assigned: Database["public"]["Enums"]["app_role"]
          used_count?: number
        }
        Update: {
          branch_id?: string | null
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          role_assigned?: Database["public"]["Enums"]["app_role"]
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invite_codes_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          invoice_data: Json
          invoice_number: string
          order_id: string
          pdf_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_data?: Json
          invoice_number: string
          order_id: string
          pdf_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_data?: Json
          invoice_number?: string
          order_id?: string
          pdf_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: Database["public"]["Enums"]["menu_category"]
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          ingredients: string[] | null
          is_available: boolean | null
          name: string
          preparation_time: number | null
          price: number
          updated_at: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["menu_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          name: string
          preparation_time?: number | null
          price: number
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["menu_category"]
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          ingredients?: string[] | null
          is_available?: boolean | null
          name?: string
          preparation_time?: number | null
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          menu_item_id: string | null
          notes: string | null
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id: string
          price: number
          quantity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          menu_item_id?: string | null
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          branch_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number
          gst: number
          id: string
          notes: string | null
          order_number: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          staff_name: string | null
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_number: number | null
          total: number
          type: Database["public"]["Enums"]["order_type"]
          updated_at: string | null
        }
        Insert: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          gst?: number
          id?: string
          notes?: string | null
          order_number: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          staff_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: number | null
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
        }
        Update: {
          branch_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number
          gst?: number
          id?: string
          notes?: string | null
          order_number?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          staff_name?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_number?: number | null
          total?: number
          type?: Database["public"]["Enums"]["order_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          transaction_id: string | null
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          order_id: string
          transaction_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          order_id?: string
          transaction_id?: string | null
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          branch_id: string | null
          created_at: string | null
          full_name: string
          id: string
          invite_code_used: string | null
          is_active: boolean | null
          phone: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          invite_code_used?: string | null
          is_active?: boolean | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          branch_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          invite_code_used?: string | null
          is_active?: boolean | null
          phone?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          id: string
          order_id: string
          payment_id: string | null
          reason: string
          requested_by: string | null
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id: string
          payment_id?: string | null
          reason: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id?: string
          payment_id?: string | null
          reason?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      report_email_logs: {
        Row: {
          branch_id: string | null
          created_at: string
          error_message: string | null
          id: string
          recipients: string[]
          report_schedule_id: string | null
          report_type: string
          sent_at: string | null
          status: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipients: string[]
          report_schedule_id?: string | null
          report_type: string
          sent_at?: string | null
          status: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          recipients?: string[]
          report_schedule_id?: string | null
          report_type?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_email_logs_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_email_logs_report_schedule_id_fkey"
            columns: ["report_schedule_id"]
            isOneToOne: false
            referencedRelation: "report_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_enabled: boolean
          last_run_at: string | null
          recipients: string[]
          report_type: string
          schedule_time: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          recipients?: string[]
          report_type: string
          schedule_time: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean
          last_run_at?: string | null
          recipients?: string[]
          report_type?: string
          schedule_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          address: string | null
          auto_backup: boolean
          auto_generate_invoice: boolean
          bill_footer_text: string | null
          bill_header_text: string | null
          bill_show_fssai: boolean | null
          bill_show_gstin: boolean | null
          bill_show_upi: boolean | null
          bill_terms: string | null
          created_at: string
          custom_bill_html: string | null
          daily_summary_email: boolean
          fssai_license: string | null
          gst_number: string | null
          gst_rate: number
          id: string
          include_gst_in_price: boolean
          kitchen_printer: string | null
          low_stock_alerts: boolean
          new_order_sound: boolean
          phone: string | null
          receipt_printer: string | null
          shop_name: string
          updated_at: string
          upi_id: string | null
        }
        Insert: {
          address?: string | null
          auto_backup?: boolean
          auto_generate_invoice?: boolean
          bill_footer_text?: string | null
          bill_header_text?: string | null
          bill_show_fssai?: boolean | null
          bill_show_gstin?: boolean | null
          bill_show_upi?: boolean | null
          bill_terms?: string | null
          created_at?: string
          custom_bill_html?: string | null
          daily_summary_email?: boolean
          fssai_license?: string | null
          gst_number?: string | null
          gst_rate?: number
          id?: string
          include_gst_in_price?: boolean
          kitchen_printer?: string | null
          low_stock_alerts?: boolean
          new_order_sound?: boolean
          phone?: string | null
          receipt_printer?: string | null
          shop_name?: string
          updated_at?: string
          upi_id?: string | null
        }
        Update: {
          address?: string | null
          auto_backup?: boolean
          auto_generate_invoice?: boolean
          bill_footer_text?: string | null
          bill_header_text?: string | null
          bill_show_fssai?: boolean | null
          bill_show_gstin?: boolean | null
          bill_show_upi?: boolean | null
          bill_terms?: string | null
          created_at?: string
          custom_bill_html?: string | null
          daily_summary_email?: boolean
          fssai_license?: string | null
          gst_number?: string | null
          gst_rate?: number
          id?: string
          include_gst_in_price?: boolean
          kitchen_printer?: string | null
          low_stock_alerts?: boolean
          new_order_sound?: boolean
          phone?: string | null
          receipt_printer?: string | null
          shop_name?: string
          updated_at?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          branch_id: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role_assigned: Database["public"]["Enums"]["app_role"]
          status: string
          used_at: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role_assigned?: Database["public"]["Enums"]["app_role"]
          status?: string
          used_at?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role_assigned?: Database["public"]["Enums"]["app_role"]
          status?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_invitations_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_performance: {
        Row: {
          average_bill_value: number
          branch_id: string | null
          created_at: string
          date: string
          id: string
          total_orders: number
          total_sales: number
          updated_at: string
          user_id: string
        }
        Insert: {
          average_bill_value?: number
          branch_id?: string | null
          created_at?: string
          date?: string
          id?: string
          total_orders?: number
          total_sales?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          average_bill_value?: number
          branch_id?: string | null
          created_at?: string
          date?: string
          id?: string
          total_orders?: number
          total_sales?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_performance_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      approve_user: {
        Args: { remarks_text?: string; target_user_id: string }
        Returns: boolean
      }
      generate_invite_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      get_staff_emails: {
        Args: { user_ids: string[] }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_user_branch: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_branch_access: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_user: {
        Args: { remarks_text?: string; target_user_id: string }
        Returns: boolean
      }
      update_own_profile: {
        Args: { _full_name: string; _phone: string }
        Returns: undefined
      }
      use_invite_code: { Args: { invite_code: string }; Returns: boolean }
      validate_invite_code: { Args: { invite_code: string }; Returns: Json }
    }
    Enums: {
      app_role:
        | "developer"
        | "central_admin"
        | "branch_admin"
        | "billing"
        | "admin"
      menu_category: "veg" | "non-veg" | "beverages" | "combos"
      order_status: "placed" | "preparing" | "ready" | "completed" | "cancelled"
      order_type: "dine-in" | "takeaway"
      payment_method: "cash" | "upi" | "card"
      payment_status: "pending" | "partial" | "completed"
      refund_status: "requested" | "approved" | "rejected"
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
      app_role: [
        "developer",
        "central_admin",
        "branch_admin",
        "billing",
        "admin",
      ],
      menu_category: ["veg", "non-veg", "beverages", "combos"],
      order_status: ["placed", "preparing", "ready", "completed", "cancelled"],
      order_type: ["dine-in", "takeaway"],
      payment_method: ["cash", "upi", "card"],
      payment_status: ["pending", "partial", "completed"],
      refund_status: ["requested", "approved", "rejected"],
    },
  },
} as const
