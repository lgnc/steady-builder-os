import { useState, useEffect, useRef, useCallback } from "react";
import { subDays, format } from "date-fns";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar } from "@/components/ui/progress-bar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dumbbell,
  CheckCircle2,
  Utensils,
  Scale,
  BookOpen,
  Flame,
  X,
} from "lucide-react";

interface Day28Metrics {
  workoutsCompleted: number;
  avgHabitsPercent: number;
  avgNutritionPercent: number;
  startWeight: number | null;
  endWeight: number | null;
  journalEntries: number;
  longestStreak: number;
}

interface Day28ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  trialStart: Date;
  onDismiss: () => void;
}

export function Day28ReviewModal({
  open,
  onOpenChange,
  userId,
  trialStart,
  onDismiss,
}: Day28ReviewModalProps) {
  const [metrics, setMetrics] = useState<Day28Metrics | null>(null);
  const [reflection, setReflection] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const trialEnd = new Date();
  const trialStartStr = format(trialStart, "yyyy-MM-dd");
  const trialEndStr = format(trialEnd, "yyyy-MM-dd");

  useEffect(() => {
    if (!open) return;

    const fetchMetrics = async () => {
      setLoading(true);

      const [
        trainingRes,
        habitsRes,
        habitCompletionsRes,
        mealPlanRes,
        mealCompletionsRes,
        weightsRes,
        journalRes,
        streaksRes,
        habitsStreakRes,
      ] = await Promise.all([
        supabase
          .from("user_training_schedule")
          .select("id")
          .eq("user_id", userId)
          .eq("completed", true),
        supabase
          .from("habits")
          .select("id")
          .eq("user_id", userId)
          .eq("is_active", true),
        supabase
          .from("habit_completions")
          .select("completed_date")
          .eq("user_id", userId)
          .gte("completed_date", trialStartStr)
          .lte("completed_date", trialEndStr),
        supabase
          .from("meal_plans")
          .select("id, plan_data")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("meal_completions")
          .select("id")
          .eq("user_id", userId)
          .eq("completed", true)
          .gte("meal_date", trialStartStr)
          .lte("meal_date", trialEndStr),
        supabase
          .from("daily_weights")
          .select("weight_kg, log_date")
          .eq("user_id", userId)
          .gte("log_date", trialStartStr)
          .lte("log_date", trialEndStr)
          .order("log_date"),
        supabase
          .from("journal_entries")
          .select("id")
          .eq("user_id", userId)
          .gte("entry_date", trialStartStr)
          .lte("entry_date", trialEndStr),
        supabase
          .from("streaks")
          .select("longest_streak")
          .eq("user_id", userId),
        supabase
          .from("habits")
          .select("longest_streak")
          .eq("user_id", userId)
          .eq("is_active", true),
      ]);

      const workoutsCompleted = trainingRes.data?.length ?? 0;

      // Habit avg
      const activeHabitCount = habitsRes.data?.length ?? 0;
      let avgHabitsPercent = 0;
      if (activeHabitCount > 0) {
        const completionsByDay = new Map<string, number>();
        habitCompletionsRes.data?.forEach((c) => {
          completionsByDay.set(c.completed_date, (completionsByDay.get(c.completed_date) ?? 0) + 1);
        });
        const totalDays = Math.min(28, completionsByDay.size || 1);
        let totalPercent = 0;
        completionsByDay.forEach((count) => {
          totalPercent += Math.min(100, Math.round((count / activeHabitCount) * 100));
        });
        avgHabitsPercent = totalDays > 0 ? Math.round(totalPercent / totalDays) : 0;
      }

      // Nutrition avg
      let avgNutritionPercent = 0;
      if (mealPlanRes.data?.plan_data) {
        const planData = mealPlanRes.data.plan_data as any;
        const mealsPerDay = planData?.days?.[0]?.meals?.length ?? 3;
        const totalExpected = mealsPerDay * 28;
        const totalCompleted = mealCompletionsRes.data?.length ?? 0;
        avgNutritionPercent = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) : 0;
      }

      // Weight
      const weights = weightsRes.data ?? [];
      const startWeight = weights.length > 0 ? Number(weights[0].weight_kg) : null;
      const endWeight = weights.length > 1 ? Number(weights[weights.length - 1].weight_kg) : null;

      // Journal
      const journalEntries = journalRes.data?.length ?? 0;

      // Longest streak
      const streakVals = [
        ...(streaksRes.data?.map((s) => s.longest_streak ?? 0) ?? []),
        ...(habitsStreakRes.data?.map((h) => h.longest_streak ?? 0) ?? []),
      ];
      const longestStreak = streakVals.length > 0 ? Math.max(...streakVals) : 0;

      setMetrics({
        workoutsCompleted,
        avgHabitsPercent,
        avgNutritionPercent,
        startWeight,
        endWeight,
        journalEntries,
        longestStreak,
      });
      setLoading(false);
    };

    fetchMetrics();
  }, [open, userId, trialStartStr, trialEndStr]);

  // Intersection observer for scroll-gated CTA
  useEffect(() => {
    if (!open || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCtaVisible(true);
      },
      { threshold: 0.5 }
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [open, loading]);

  const handleComplete = useCallback(async () => {
    if (!metrics) return;
    setSubmitting(true);

    const payload = {
      user_id: userId,
      day28_review_completed: true,
      workouts_completed: metrics.workoutsCompleted,
      avg_habits_percent: metrics.avgHabitsPercent,
      avg_nutrition_percent: metrics.avgNutritionPercent,
      start_weight: metrics.startWeight,
      end_weight: metrics.endWeight,
      journal_entries: metrics.journalEntries,
      longest_streak: metrics.longestStreak,
      reflection_text: reflection || null,
      completed_at: new Date().toISOString(),
    };

    // Check if row exists
    const { data: existing } = await supabase
      .from("day28_reviews")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("day28_reviews")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase.from("day28_reviews").insert(payload);
    }

    setSubmitting(false);
    toast.success("Review saved. Keep building.");
    onOpenChange(false);
  }, [metrics, reflection, userId, onOpenChange]);

  const handleDismiss = () => {
    onDismiss();
    onOpenChange(false);
  };

  const weightDelta =
    metrics?.startWeight != null && metrics?.endWeight != null
      ? (metrics.endWeight - metrics.startWeight).toFixed(1)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-full max-h-full w-full m-0 p-0 rounded-none border-none bg-background overflow-y-auto [&>button]:hidden">
        <div className="min-h-full flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">28-Day Review</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You've completed 4 weeks of structure. Here's what changed.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-pulse text-muted-foreground">Calculating your progress...</div>
              </div>
            ) : metrics ? (
              <>
                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard
                    icon={Dumbbell}
                    label="Workouts"
                    value={String(metrics.workoutsCompleted)}
                    sub="sessions completed"
                  />
                  <MetricCard
                    icon={CheckCircle2}
                    label="Habits"
                    value={`${metrics.avgHabitsPercent}%`}
                    sub="avg daily completion"
                    progress={metrics.avgHabitsPercent}
                  />
                  <MetricCard
                    icon={Utensils}
                    label="Nutrition"
                    value={`${metrics.avgNutritionPercent}%`}
                    sub="compliance"
                    progress={metrics.avgNutritionPercent}
                  />
                  <MetricCard
                    icon={Scale}
                    label="Weight"
                    value={
                      weightDelta != null
                        ? `${Number(weightDelta) > 0 ? "+" : ""}${weightDelta} kg`
                        : "—"
                    }
                    sub={
                      metrics.startWeight != null && metrics.endWeight != null
                        ? `${metrics.startWeight} → ${metrics.endWeight} kg`
                        : "No weigh-ins logged yet"
                    }
                  />
                  <MetricCard
                    icon={BookOpen}
                    label="Journal"
                    value={String(metrics.journalEntries)}
                    sub="entries written"
                  />
                  <MetricCard
                    icon={Flame}
                    label="Best Streak"
                    value={String(metrics.longestStreak)}
                    sub="days"
                  />
                </div>

                {/* Sentinel for scroll gate */}
                <div ref={sentinelRef} className="h-1" />

                {/* Reflection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-muted-foreground">
                    How do you feel compared to 4 weeks ago?
                  </label>
                  <Textarea
                    value={reflection}
                    onChange={(e) => setReflection(e.target.value)}
                    placeholder="Write your reflection..."
                    className="min-h-[100px] bg-card border-border"
                  />
                </div>

                {/* Reinforcement */}
                <p className="text-sm text-muted-foreground italic text-center py-2">
                  This is what structure does. You don't need motivation — you need a system.
                </p>

                {/* CTA Section */}
                <div
                  className={`space-y-3 pt-4 transition-all duration-500 ${
                    ctaVisible ? "opacity-100" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleComplete}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Continue with BetterMENt →"}
                  </Button>
                  <button
                    onClick={handleDismiss}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    Not now
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  progress,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: string;
  sub: string;
  progress?: number;
}) {
  return (
    <div className="card-stat p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {progress != null && (
        <ProgressBar value={progress} />
      )}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
