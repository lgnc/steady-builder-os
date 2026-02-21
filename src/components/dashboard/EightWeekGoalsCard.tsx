import { useEffect, useState } from "react";
import { Target, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { ProgressBar } from "@/components/ui/progress-bar";

interface GoalRow {
  id: string;
  goal_type: string;
  goal_label: string;
  target_value: number;
  baseline_value: number;
  current_value: number;
  created_at: string;
  locked_at: string | null;
}

function computeProgress(goal: GoalRow): { pct: number; isNegative: boolean } {
  const { goal_type, baseline_value, target_value, current_value } = goal;

  // Percentage-based goals (consistency, habits, nutrition)
  if (["consistency", "habits", "nutrition"].includes(goal_type)) {
    const pct = Math.min(100, Math.max(0, (current_value / target_value) * 100));
    return { pct, isNegative: false };
  }

  // Weight loss: progress = how much lost vs target loss
  if (goal_type === "weight_loss") {
    const toLose = target_value; // e.g. 2.5kg
    const lost = baseline_value - current_value; // negative if gained weight
    if (toLose <= 0) return { pct: 0, isNegative: false };
    const raw = (lost / toLose) * 100;
    return { pct: Math.min(100, raw), isNegative: raw < 0 };
  }

  // Strength / pull-ups: progress toward target from baseline
  const range = target_value - baseline_value;
  if (range <= 0) return { pct: current_value >= target_value ? 100 : 0, isNegative: false };
  const raw = ((current_value - baseline_value) / range) * 100;
  return { pct: Math.min(100, raw), isNegative: raw < 0 };
}

export function EightWeekGoalsCard({ userId }: { userId: string }) {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      const { data } = await supabase
        .from("user_eight_week_goals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at");

      if (data && data.length > 0) {
        // Update current values from real data
        const updated = await Promise.all(data.map((g: any) => updateCurrentValue(g, userId)));
        setGoals(updated);
      }
      setLoading(false);
    };

    fetchGoals();
  }, [userId]);

  if (loading || goals.length === 0) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="card-stat p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium">8-Week Goals</h3>
      </div>

      <div className="space-y-3">
        {goals.map((goal) => {
          const { pct, isNegative } = computeProgress(goal);
          const displayPct = Math.round(pct);
          return (
            <div key={goal.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{goal.goal_label}</span>
                <span className={isNegative ? "text-destructive font-medium" : "text-muted-foreground"}>
                  {isNegative ? `${displayPct}%` : `${displayPct}%`}
                </span>
              </div>
              <ProgressBar value={Math.max(0, pct)} fillClassName={isNegative ? "bg-destructive" : undefined} />
              {isNegative && (
                <p className="text-[10px] text-destructive">
                  {goal.goal_type === "weight_loss"
                    ? `+${(goal.current_value - goal.baseline_value).toFixed(1)}kg from start`
                    : "Below baseline"}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

async function updateCurrentValue(goal: GoalRow, userId: string): Promise<GoalRow> {
  try {
    switch (goal.goal_type) {
      case "weight_loss": {
        const { data } = await supabase
          .from("daily_weights")
          .select("weight_kg")
          .eq("user_id", userId)
          .order("log_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          const val = Number(data.weight_kg);
          if (val !== goal.current_value) {
            await supabase.from("user_eight_week_goals").update({ current_value: val }).eq("id", goal.id);
            return { ...goal, current_value: val };
          }
        }
        break;
      }
      case "bench_press":
      case "squat":
      case "deadlift": {
        const exerciseNames: Record<string, string[]> = {
          bench_press: ["Bench Press", "Flat Barbell Bench Press", "Barbell Bench Press"],
          squat: ["Squat", "Barbell Back Squat", "Back Squat"],
          deadlift: ["Deadlift", "Conventional Deadlift", "Barbell Deadlift"],
        };
        const names = exerciseNames[goal.goal_type] || [];
        const { data: exercises } = await supabase
          .from("training_exercises")
          .select("id")
          .in("name", names);
        if (exercises && exercises.length > 0) {
          const exIds = exercises.map((e) => e.id);
          const { data: logs } = await supabase
            .from("workout_logs")
            .select("weight_kg")
            .eq("user_id", userId)
            .in("exercise_id", exIds)
            .not("weight_kg", "is", null)
            .order("weight_kg", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (logs) {
            const val = Number(logs.weight_kg);
            if (val !== goal.current_value) {
              await supabase.from("user_eight_week_goals").update({ current_value: val }).eq("id", goal.id);
              return { ...goal, current_value: val };
            }
          }
        }
        break;
      }
      case "pull_ups": {
        const { data: exercises } = await supabase
          .from("training_exercises")
          .select("id")
          .in("name", ["Pull-ups", "Pull-Ups", "Pullups", "Pull Up"]);
        if (exercises && exercises.length > 0) {
          const exIds = exercises.map((e) => e.id);
          const { data: logs } = await supabase
            .from("workout_logs")
            .select("reps_completed")
            .eq("user_id", userId)
            .in("exercise_id", exIds)
            .not("reps_completed", "is", null)
            .order("reps_completed", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (logs) {
            const val = Number(logs.reps_completed);
            if (val !== goal.current_value) {
              await supabase.from("user_eight_week_goals").update({ current_value: val }).eq("id", goal.id);
              return { ...goal, current_value: val };
            }
          }
        }
        break;
      }
      case "consistency": {
        const { data: total } = await supabase
          .from("user_training_schedule")
          .select("id", { count: "exact" })
          .eq("user_id", userId);
        const { data: completed } = await supabase
          .from("user_training_schedule")
          .select("id", { count: "exact" })
          .eq("user_id", userId)
          .eq("completed", true);
        const totalCount = total?.length ?? 0;
        const completedCount = completed?.length ?? 0;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        if (pct !== goal.current_value) {
          await supabase.from("user_eight_week_goals").update({ current_value: pct }).eq("id", goal.id);
          return { ...goal, current_value: pct };
        }
        break;
      }
      case "habits": {
        const { data: habits } = await supabase
          .from("habits")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true);
        if (habits && habits.length > 0) {
          const { data: completions } = await supabase
            .from("habit_completions")
            .select("id", { count: "exact" })
            .eq("user_id", userId);
          // Rough: completions / (habits * days since goal created)
          const daysSince = Math.max(1, Math.ceil((Date.now() - new Date(goal.created_at).getTime()) / 86400000));
          const expected = habits.length * daysSince;
          const pct = expected > 0 ? Math.round(((completions?.length ?? 0) / expected) * 100) : 0;
          if (pct !== goal.current_value) {
            await supabase.from("user_eight_week_goals").update({ current_value: pct }).eq("id", goal.id);
            return { ...goal, current_value: pct };
          }
        }
        break;
      }
      case "nutrition": {
        const { data: completions } = await supabase
          .from("meal_completions")
          .select("id, completed")
          .eq("user_id", userId);
        if (completions && completions.length > 0) {
          const completed = completions.filter((c) => c.completed).length;
          const pct = Math.round((completed / completions.length) * 100);
          if (pct !== goal.current_value) {
            await supabase.from("user_eight_week_goals").update({ current_value: pct }).eq("id", goal.id);
            return { ...goal, current_value: pct };
          }
        }
        break;
      }
    }
  } catch (e) {
    console.error("Error updating goal value:", e);
  }
  return goal;
}
