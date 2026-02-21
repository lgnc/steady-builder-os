import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Dumbbell, CheckCircle, Utensils, Scale, Flame } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getSundayWeekStartDate } from "@/lib/weekUtils";
import { toast } from "sonner";
import type { WeeklyData } from "./WeeklyPerformanceCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WeeklyData | null;
}

export function WeeklyReviewModal({ open, onOpenChange, data }: Props) {
  const { user } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !data || !user) {
      return;
    }

    let cancelled = false;
    const weekStart = getSundayWeekStartDate(new Date());

    const fetchOrGenerate = async () => {
      // Check cache first
      const { data: cached } = await supabase
        .from("weekly_review_summaries" as any)
        .select("summary_text")
        .eq("user_id", user.id)
        .eq("week_start", weekStart)
        .maybeSingle();

      if (cancelled) return;

      if ((cached as any)?.summary_text) {
        setSummary((cached as any).summary_text);
        return;
      }

      // Generate via edge function
      setLoading(true);
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          "weekly-review-summary",
          {
            body: {
              trainingCompleted: data.trainingCompleted,
              trainingTotal: data.trainingTotal,
              habitPercent: data.habitPercent,
              nutritionPercent: data.nutritionPercent,
              weightDelta: data.weightDelta,
              longestStreak: data.longestStreak,
            },
          }
        );

        if (cancelled) return;

        if (fnError) {
          console.error("Edge function error:", fnError);
          toast.error("Couldn't generate coaching summary. Try again later.");
          return;
        }

        const text = fnData?.summary;
        if (!text) return;

        setSummary(text);

        // Cache it
        await supabase.from("weekly_review_summaries" as any).insert({
          user_id: user.id,
          week_start: weekStart,
          summary_text: text,
        } as any);
      } catch (err) {
        console.error("Summary generation failed:", err);
        toast.error("Couldn't generate coaching summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOrGenerate();

    return () => {
      cancelled = true;
    };
  }, [open, data, user]);

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Weekly Review</DialogTitle>
          <DialogDescription className="italic text-xs">
            Execution creates identity. Review your week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Training */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Training</span>
              </div>
              <span className="text-sm">
                {data.trainingCompleted} of {data.trainingTotal} completed
              </span>
            </div>
            {data.trainingTotal > 0 && (
              <ProgressBar
                value={data.trainingCompleted}
                max={data.trainingTotal}
                className="h-1.5"
              />
            )}
          </div>

          {/* Habits */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">Habits</span>
              </div>
              <span className="text-sm">{data.habitPercent}% complete</span>
            </div>
            <ProgressBar value={data.habitPercent} className="h-1.5" />
          </div>

          {/* Nutrition */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Utensils className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Nutrition</span>
              </div>
              <span className="text-sm">{data.nutritionPercent}% compliant</span>
            </div>
            <ProgressBar value={data.nutritionPercent} className="h-1.5" />
          </div>

          {/* Weight */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-info" />
              <span className="text-sm font-medium">Weight</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {data.weightDelta !== null
                ? `${data.weightDelta > 0 ? "+" : ""}${data.weightDelta} kg this week`
                : "No weight logged this week"}
            </span>
          </div>

          {/* Streak */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Longest Streak</span>
            </div>
            <span className="text-sm">{data.longestStreak} days</span>
          </div>

          {/* AI Coaching Summary */}
          <Separator className="my-2" />

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Coach's Review</h3>

            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[95%]" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[80%]" />
              </div>
            ) : summary ? (
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {summary}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                Summary will generate when you open this review.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
