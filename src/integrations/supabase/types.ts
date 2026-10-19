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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          a: string
          exam_id: string
          id: string
          position: number
          q: string
          section_id: string | null
          source: string
        }
        Insert: {
          a: string
          exam_id: string
          id?: string
          position?: number
          q: string
          section_id?: string | null
          source?: string
        }
        Update: {
          a?: string
          exam_id?: string
          id?: string
          position?: number
          q?: string
          section_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          color: string
          created_at: string
          id: string
          is_sample: boolean
          owner_id: string | null
          title: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          owner_id?: string | null
          title: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          is_sample?: boolean
          owner_id?: string | null
          title?: string
        }
        Relationships: []
      }
      exam_attempts: {
        Row: {
          created_at: string
          exam_id: string
          finished: boolean
          id: string
          question_ids: string[]
          results: Json
          retake_of: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          finished?: boolean
          id?: string
          question_ids: string[]
          results?: Json
          retake_of?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          finished?: boolean
          id?: string
          question_ids?: string[]
          results?: Json
          retake_of?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_plans: {
        Row: {
          due_date: string | null
          exam_id: string
          kind: string
          updated_at: string
          user_id: string
        }
        Insert: {
          due_date?: string | null
          exam_id: string
          kind?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          due_date?: string | null
          exam_id?: string
          kind?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_plans_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          course_id: string
          created_at: string
          error: string | null
          exam_date: string | null
          id: string
          is_sample: boolean
          owner_id: string | null
          status: string
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          error?: string | null
          exam_date?: string | null
          id?: string
          is_sample?: boolean
          owner_id?: string | null
          status?: string
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          error?: string | null
          exam_date?: string | null
          id?: string
          is_sample?: boolean
          owner_id?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      gem_ledger: {
        Row: {
          created_at: string
          delta: number
          id: string
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gem_wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      materials: {
        Row: {
          created_at: string
          exam_id: string
          extracted_text: string
          id: string
          mime: string
          name: string
          storage_path: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          extracted_text?: string
          id?: string
          mime?: string
          name: string
          storage_path?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          extracted_text?: string
          id?: string
          mime?: string
          name?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_notes: {
        Row: {
          body: string
          created_at: string
          exam_id: string
          id: string
          source: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          exam_id: string
          id?: string
          source?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          exam_id?: string
          id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      podcasts: {
        Row: {
          audio_urls: string[]
          detail: string
          exam_id: string
          id: string
          position: number
          script: string
          section_id: string | null
          status: string
          storage_paths: string[]
          title: string
        }
        Insert: {
          audio_urls?: string[]
          detail?: string
          exam_id: string
          id?: string
          position?: number
          script?: string
          section_id?: string | null
          status?: string
          storage_paths?: string[]
          title: string
        }
        Update: {
          audio_urls?: string[]
          detail?: string
          exam_id?: string
          id?: string
          position?: number
          script?: string
          section_id?: string | null
          status?: string
          storage_paths?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "podcasts_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          settings: Json
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          settings?: Json
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          settings?: Json
        }
        Relationships: []
      }
      questions: {
        Row: {
          a: string
          exam_id: string
          id: string
          position: number
          q: string
          section_id: string | null
        }
        Insert: {
          a: string
          exam_id: string
          id?: string
          position?: number
          q: string
          section_id?: string | null
        }
        Update: {
          a?: string
          exam_id?: string
          id?: string
          position?: number
          q?: string
          section_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      review_state: {
        Row: {
          due_at: string
          ease: number
          exam_id: string
          interval_days: number
          item_id: string
          kind: string
          lapses: number
          reps: number
          updated_at: string
          user_id: string
        }
        Insert: {
          due_at?: string
          ease?: number
          exam_id: string
          interval_days?: number
          item_id: string
          kind?: string
          lapses?: number
          reps?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          due_at?: string
          ease?: number
          exam_id?: string
          interval_days?: number
          item_id?: string
          kind?: string
          lapses?: number
          reps?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_state_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          exam_id: string
          id: string
          position: number
          summary: string
          title: string
        }
        Insert: {
          exam_id: string
          id?: string
          position?: number
          summary?: string
          title: string
        }
        Update: {
          exam_id?: string
          id?: string
          position?: number
          summary?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
      study_events: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          kind: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          kind: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          kind?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_events_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_read_exam: { Args: { _exam: string }; Returns: boolean }
      can_write_course: { Args: { _course: string }; Returns: boolean }
      can_write_exam: { Args: { _exam: string }; Returns: boolean }
      credit_gems: {
        Args: { _amount: number; _reason: string; _ref: string; _user: string }
        Returns: undefined
      }
      ensure_wallet: { Args: never; Returns: number }
      refund_gems: { Args: { _cost: number; _reason: string }; Returns: number }
      spend_gems: { Args: { _cost: number; _reason: string }; Returns: number }
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
    Enums: {},
  },
} as const
