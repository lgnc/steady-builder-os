import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format, differenceInDays, min } from "date-fns";
import { Dumbbell, CheckCircle, Utensils, Scale, Flame, ChevronRight } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface WeeklyData {
  trainingCompleted: number;
  trainingTotal: number;
  habitPercent: number;
  nutritionPercent: number;
  weightDelta: number | null;
  longestStreak: number;
}

interface Props {
  userId: string;
  onOpenReview: () => void;
  onDataLoaded?: (data: WeeklyData) => void;
}

export function WeeklyPerformanceCard({ userId, onOpenReview, onDataLoaded }: Props) {
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, [userId]);

  async function fetchWeeklyData() {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const today = min([now, weekEnd]);
    const daysElapsed = differenceInDays(today, weekStart) + 1;
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(today, "yyyy-MM-dd");

    // Build day_of_week array for this week (0=Sun)
    const daysOfWeek: number[] = [];
    for (let i = 0; i < daysElapsed; i++) {
      daysOfWeek.push((weekStart.getDay() + i) % 7);
    }

    const [trainingRes, scheduleRes, habitsRes, completionsRes, mealPlansRes, mealCompletionsRes, weightsRes, streaksRes, habitStreaksRes] = await Promise.all([
      // Training blocks for this week's days
      supabase.from("schedule_blocks").select("day_of_week").eq("user_id", userId).eq("block_type", "training").in("day_of_week", daysOfWeek),
      // Completed training sessions
      supabase.from("user_training_schedule").select("day_of_week, completed").eq("user_id", userId).eq("completed", true).in("day_of_week", daysOfWeek),
      // Active habits
      supabase.from("habits").select("id").eq("user_id", userId).eq("is_active", true),
      // Habit completions this week
      supabase.from("habit_completions").select("completed_date").eq("user_id", userId).gte("completed_date", startStr).lte("completed_date", endStr),
      // Active meal plans
      supabase.from("meal_plans").select("plan_data").eq("user_id", userId).order("created_at", { ascending: false }).limit(1),
      // Meal completions this week
      supabase.from("meal_completions").select("completed").eq("user_id", userId).eq("completed", true).gte("meal_date", startStr).lte("meal_date", endStr),
      // Weights this week
      supabase.from("daily_weights").select("weight_kg, log_date").eq("user_id", userId).gte("log_date", startStr).lte("log_date", endStr).order("log_date", { ascending: true }),
      // Streaks
      supabase.from("streaks").select("current_streak").eq("user_id", userId),
      // Habit streaks
      supabase.from("habits").select("current_streak").eq("user_id", userId).eq("is_active", true),
    ]);

    // Training
    const trainingTotal = new Set((trainingRes.data || []).map(b => b.day_of_week)).size;
    const trainingCompleted = new Set((scheduleRes.data || []).map(s => s.day_of_week)).size;

    // Habits
    const habitCount = habitsRes.data?.length || 0;
    const totalPossible = habitCount * daysElapsed;
    const totalCompleted = completionsRes.data?.length || 0;
    const habitPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    // Nutrition
    let nutritionPercent = 0;
    if (mealPlansRes.data?.length) {
      const planData = mealPlansRes.data[0].plan_data as any;
      const days = planData?.days || [];
      let totalMeals = 0;
      for (const day of days) {
        totalMeals += (day.meals?.length || 0);
      }
      const completedMeals = mealCompletionsRes.data?.length || 0;
      // Scale total meals to days elapsed
      const mealsPerDay = days.length > 0 ? totalMeals / days.length : 0;
      const expectedMeals = Math.round(mealsPerDay * daysElapsed);
      nutritionPercent = expectedMeals > 0 ? Math.round((completedMeals / expectedMeals) * 100) : 0;
    }

    // Weight
    const weights = weightsRes.data || [];
    let weightDelta: number | null = null;
    if (weights.length >= 2) {
      weightDelta = Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg);
      weightDelta = Math.round(weightDelta * 10) / 10;
    }

    // Streaks
    const streakVals = (streaksRes.data || []).map(s => s.current_streak || 0);
    const habitStreakVals = (habitStreaksRes.data || []).map(h => h.current_streak || 0);
    const longestStreak = Math.max(0, ...streakVals, ...habitStreakVals);

    const result = { trainingCompleted, trainingTotal, habitPercent, nutritionPercent, weightDelta, longestStreak };
    setData(result);
    onDataLoaded?.(result);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="card-ritual animate-pulse space-y-3">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-2/3" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="space-y-4"
    >
      <h2 className="text-sm font-medium text-muted-foreground">This Week's Performance</h2>

      <div className="card-ritual space-y-4">
        {/* Training */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-primary" />
            <span className="text-sm">Training</span>
          </div>
          <span className="text-sm font-medium">{data.trainingCompleted} / {data.trainingTotal} sessions</span>
        </div>

        {/* Habits */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm">Habits</span>
            </div>
            <span className="text-sm font-medium">{data.habitPercent}%</span>
          </div>
          <ProgressBar value={data.habitPercent} className="h-1.5" />
        </div>

        {/* Nutrition */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-500" />
              <span className="text-sm">Nutrition</span>
            </div>
            <span className="text-sm font-medium">{data.nutritionPercent}%</span>
          </div>
          <ProgressBar value={data.nutritionPercent} className="h-1.5" />
        </div>

        {/* Weight */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-info" />
            <span className="text-sm">Weight</span>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {data.weightDelta !== null
              ? `${data.weightDelta > 0 ? "+" : ""}${data.weightDelta} kg this week`
              : "No weight logged"}
          </span>
        </div>

        {/* Streak */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm">Longest Streak</span>
          </div>
          <span className="text-sm font-medium">{data.longestStreak} days</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={onOpenReview}
      >
        View Weekly Review
        <ChevronRight className="h-4 w-4" />
      </Button>
    </motion.section>
  );
}
