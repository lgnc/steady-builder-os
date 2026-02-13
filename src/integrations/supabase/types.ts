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
      daily_weights: {
        Row: {
          created_at: string
          id: string
          log_date: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      day28_reviews: {
        Row: {
          avg_habits_percent: number | null
          avg_nutrition_percent: number | null
          completed_at: string | null
          created_at: string
          day28_review_completed: boolean
          end_weight: number | null
          id: string
          journal_entries: number | null
          longest_streak: number | null
          reflection_text: string | null
          start_weight: number | null
          user_id: string
          workouts_completed: number | null
        }
        Insert: {
          avg_habits_percent?: number | null
          avg_nutrition_percent?: number | null
          completed_at?: string | null
          created_at?: string
          day28_review_completed?: boolean
          end_weight?: number | null
          id?: string
          journal_entries?: number | null
          longest_streak?: number | null
          reflection_text?: string | null
          start_weight?: number | null
          user_id: string
          workouts_completed?: number | null
        }
        Update: {
          avg_habits_percent?: number | null
          avg_nutrition_percent?: number | null
          completed_at?: string | null
          created_at?: string
          day28_review_completed?: boolean
          end_weight?: number | null
          id?: string
          journal_entries?: number | null
          longest_streak?: number | null
          reflection_text?: string | null
          start_weight?: number | null
          user_id?: string
          workouts_completed?: number | null
        }
        Relationships: []
      }
      favourite_meals: {
        Row: {
          created_at: string
          id: string
          meal_data: Json
          meal_slot: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meal_data?: Json
          meal_slot: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meal_data?: Json
          meal_slot?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_completions: {
        Row: {
          completed_date: string
          created_at: string
          habit_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed_date: string
          created_at?: string
          habit_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed_date?: string
          created_at?: string
          habit_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_completions_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          current_streak: number
          habit_type: string
          id: string
          is_active: boolean
          last_completed_date: string | null
          longest_streak: number
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          habit_type?: string
          id?: string
          is_active?: boolean
          last_completed_date?: string | null
          longest_streak?: number
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          habit_type?: string
          id?: string
          is_active?: boolean
          last_completed_date?: string | null
          longest_streak?: number
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: Json
          created_at: string
          entry_date: string
          entry_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          entry_date?: string
          entry_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          entry_date?: string
          entry_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meal_completions: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          meal_date: string
          meal_plan_id: string
          meal_slot: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          meal_date: string
          meal_plan_id: string
          meal_slot: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          meal_date?: string
          meal_plan_id?: string
          meal_slot?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_completions_meal_plan_id_fkey"
            columns: ["meal_plan_id"]
            isOneToOne: false
            referencedRelation: "meal_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plans: {
        Row: {
          compliance_score: number | null
          created_at: string
          expires_at: string
          id: string
          plan_data: Json
          user_id: string
          week_start: string
        }
        Insert: {
          compliance_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          plan_data?: Json
          user_id: string
          week_start: string
        }
        Update: {
          compliance_score?: number | null
          created_at?: string
          expires_at?: string
          id?: string
          plan_data?: Json
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      nutrition_profiles: {
        Row: {
          bmr: number
          calorie_target: number
          carb_g: number
          created_at: string
          dietary_filters: string[] | null
          fat_g: number
          generated_at: string
          id: string
          meals_per_day: number
          protein_g: number
          tdee: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bmr: number
          calorie_target: number
          carb_g: number
          created_at?: string
          dietary_filters?: string[] | null
          fat_g: number
          generated_at?: string
          id?: string
          meals_per_day?: number
          protein_g: number
          tdee: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bmr?: number
          calorie_target?: number
          carb_g?: number
          created_at?: string
          dietary_filters?: string[] | null
          fat_g?: number
          generated_at?: string
          id?: string
          meals_per_day?: number
          protein_g?: number
          tdee?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      onboarding_data: {
        Row: {
          activity_level: string | null
          age: number | null
          allergies: string | null
          bedtime: string | null
          calorie_target: number | null
          carb_target: number | null
          commute_minutes: number | null
          created_at: string
          dietary_choices: string[] | null
          experience_tier: string
          fat_target: number | null
          fifo_shift_length: number | null
          fifo_shift_type: string | null
          flexible_work: boolean | null
          friction_points: string[] | null
          gender: string | null
          gym_commute_minutes: number
          gym_to_work_direct: boolean
          height_cm: number | null
          id: string
          journaling_openness: number | null
          nutrition_confidence: number | null
          onboarding_completed: boolean | null
          onboarding_habits_break: string[] | null
          onboarding_habits_build: string[] | null
          onboarding_step: number | null
          preferred_training_days: string[] | null
          preferred_training_window: string | null
          primary_goals: string[] | null
          protein_target: number | null
          reading_habit: number | null
          rest_days: string[] | null
          secondary_goals: string[] | null
          selected_program: string | null
          sensitivities: string | null
          sleep_duration: number
          strategy_day: number | null
          stress_level: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
          wake_time: string
          weekend_bedtime: string | null
          weekend_wake_time: string | null
          weight_kg: number | null
          work_end: string | null
          work_start: string | null
          work_to_gym_minutes: number
          work_type: string
        }
        Insert: {
          activity_level?: string | null
          age?: number | null
          allergies?: string | null
          bedtime?: string | null
          calorie_target?: number | null
          carb_target?: number | null
          commute_minutes?: number | null
          created_at?: string
          dietary_choices?: string[] | null
          experience_tier?: string
          fat_target?: number | null
          fifo_shift_length?: number | null
          fifo_shift_type?: string | null
          flexible_work?: boolean | null
          friction_points?: string[] | null
          gender?: string | null
          gym_commute_minutes?: number
          gym_to_work_direct?: boolean
          height_cm?: number | null
          id?: string
          journaling_openness?: number | null
          nutrition_confidence?: number | null
          onboarding_completed?: boolean | null
          onboarding_habits_break?: string[] | null
          onboarding_habits_build?: string[] | null
          onboarding_step?: number | null
          preferred_training_days?: string[] | null
          preferred_training_window?: string | null
          primary_goals?: string[] | null
          protein_target?: number | null
          reading_habit?: number | null
          rest_days?: string[] | null
          secondary_goals?: string[] | null
          selected_program?: string | null
          sensitivities?: string | null
          sleep_duration?: number
          strategy_day?: number | null
          stress_level?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
          wake_time?: string
          weekend_bedtime?: string | null
          weekend_wake_time?: string | null
          weight_kg?: number | null
          work_end?: string | null
          work_start?: string | null
          work_to_gym_minutes?: number
          work_type?: string
        }
        Update: {
          activity_level?: string | null
          age?: number | null
          allergies?: string | null
          bedtime?: string | null
          calorie_target?: number | null
          carb_target?: number | null
          commute_minutes?: number | null
          created_at?: string
          dietary_choices?: string[] | null
          experience_tier?: string
          fat_target?: number | null
          fifo_shift_length?: number | null
          fifo_shift_type?: string | null
          flexible_work?: boolean | null
          friction_points?: string[] | null
          gender?: string | null
          gym_commute_minutes?: number
          gym_to_work_direct?: boolean
          height_cm?: number | null
          id?: string
          journaling_openness?: number | null
          nutrition_confidence?: number | null
          onboarding_completed?: boolean | null
          onboarding_habits_break?: string[] | null
          onboarding_habits_build?: string[] | null
          onboarding_step?: number | null
          preferred_training_days?: string[] | null
          preferred_training_window?: string | null
          primary_goals?: string[] | null
          protein_target?: number | null
          reading_habit?: number | null
          rest_days?: string[] | null
          secondary_goals?: string[] | null
          selected_program?: string | null
          sensitivities?: string | null
          sleep_duration?: number
          strategy_day?: number | null
          stress_level?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
          wake_time?: string
          weekend_bedtime?: string | null
          weekend_wake_time?: string | null
          weight_kg?: number | null
          work_end?: string | null
          work_start?: string | null
          work_to_gym_minutes?: number
          work_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          minutes_read: number
          pages_read: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          minutes_read?: number
          pages_read?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          minutes_read?: number
          pages_read?: number
          user_id?: string
        }
        Relationships: []
      }
      routine_checklist_completions: {
        Row: {
          checklist_item_id: string
          completed_at: string
          completed_date: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          checklist_item_id: string
          completed_at?: string
          completed_date?: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          checklist_item_id?: string
          completed_at?: string
          completed_date?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_checklist_completions_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "routine_checklist_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_checklist_items: {
        Row: {
          created_at: string
          id: string
          routine_type: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          routine_type?: string
          sort_order?: number
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          routine_type?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          block_type: string
          color: string | null
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_locked: boolean | null
          start_time: string
          title: string
          training_day_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          block_type: string
          color?: string | null
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_locked?: boolean | null
          start_time: string
          title: string
          training_day_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          block_type?: string
          color?: string | null
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_locked?: boolean | null
          start_time?: string
          title?: string
          training_day_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_blocks_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_days"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          created_at: string
          current_streak: number | null
          id: string
          last_completed_date: string | null
          longest_streak: number | null
          streak_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_completed_date?: string | null
          longest_streak?: number | null
          streak_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number | null
          id?: string
          last_completed_date?: string | null
          longest_streak?: number | null
          streak_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_days: {
        Row: {
          created_at: string
          day_number: number
          focus: string
          id: string
          mobility_items: Json
          name: string
          program_key: string
          warmup_items: Json
        }
        Insert: {
          created_at?: string
          day_number: number
          focus: string
          id?: string
          mobility_items?: Json
          name: string
          program_key: string
          warmup_items?: Json
        }
        Update: {
          created_at?: string
          day_number?: number
          focus?: string
          id?: string
          mobility_items?: Json
          name?: string
          program_key?: string
          warmup_items?: Json
        }
        Relationships: []
      }
      training_exercises: {
        Row: {
          created_at: string
          exercise_order: number
          form_cues: string[]
          id: string
          name: string
          notes: string | null
          reps: string
          rest_seconds: number | null
          sets_advanced: number
          sets_amateur: number
          sets_beginner: number
          sets_intermediate: number
          training_day_id: string
        }
        Insert: {
          created_at?: string
          exercise_order: number
          form_cues?: string[]
          id?: string
          name: string
          notes?: string | null
          reps: string
          rest_seconds?: number | null
          sets_advanced?: number
          sets_amateur?: number
          sets_beginner?: number
          sets_intermediate?: number
          training_day_id: string
        }
        Update: {
          created_at?: string
          exercise_order?: number
          form_cues?: string[]
          id?: string
          name?: string
          notes?: string | null
          reps?: string
          rest_seconds?: number | null
          sets_advanced?: number
          sets_amateur?: number
          sets_beginner?: number
          sets_intermediate?: number
          training_day_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_exercises_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_days"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          created_at: string
          days_per_week: number
          description: string | null
          id: string
          name: string
          program_key: string
          program_type: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          description?: string | null
          id?: string
          name: string
          program_key: string
          program_type: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          description?: string | null
          id?: string
          name?: string
          program_key?: string
          program_type?: string
        }
        Relationships: []
      }
      user_training_schedule: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          day_of_week: number
          id: string
          training_day_id: string
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_of_week: number
          id?: string
          training_day_id: string
          updated_at?: string
          user_id: string
          week_number?: number
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          day_of_week?: number
          id?: string
          training_day_id?: string
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_training_schedule_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_days"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          reps_completed: number | null
          set_number: number
          training_day_id: string
          updated_at: string
          user_id: string
          week_number: number
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          reps_completed?: number | null
          set_number: number
          training_day_id: string
          updated_at?: string
          user_id: string
          week_number?: number
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          reps_completed?: number | null
          set_number?: number
          training_day_id?: string
          updated_at?: string
          user_id?: string
          week_number?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "training_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_logs_training_day_id_fkey"
            columns: ["training_day_id"]
            isOneToOne: false
            referencedRelation: "training_days"
            referencedColumns: ["id"]
          },
        ]
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
