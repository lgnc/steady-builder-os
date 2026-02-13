import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Dumbbell, CheckCircle, Utensils, Scale, Flame } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { WeeklyData } from "./WeeklyPerformanceCard";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: WeeklyData | null;
}

export function WeeklyReviewModal({ open, onOpenChange, data }: Props) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
