import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, Flame, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExerciseImprovement {
  name: string;
  type: string; // "weight" | "reps" | "volume"
  detail: string;
}

export interface SummaryData {
  improvements: ExerciseImprovement[];
  totalVolume: number;
  prevVolume: number | null;
  weeklyCompleted: number;
  weeklyTotal: number;
}

interface WorkoutSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SummaryData;
}

export function WorkoutSummaryModal({ open, onOpenChange, data }: WorkoutSummaryModalProps) {
  const navigate = useNavigate();
  const volumeDelta = data.prevVolume != null ? data.totalVolume - data.prevVolume : null;
  const volumePercent = data.prevVolume && data.prevVolume > 0
    ? Math.round((volumeDelta! / data.prevVolume) * 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            Workout Complete
          </DialogTitle>
          <DialogDescription>
            Here's how you did this session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Improvements */}
          {data.improvements.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Improvements 🔥
              </h4>
              {data.improvements.map((imp, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span>
                    <span className="font-medium">{imp.name}</span>
                    <span className="text-muted-foreground"> — {imp.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Session logged. Stay consistent — progress compounds. 💪
            </div>
          )}

          {/* Volume */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Session Volume
            </h4>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">
                {data.totalVolume.toLocaleString()} kg
              </span>
              {volumeDelta != null && (
                <span
                  className={`text-sm font-medium ${
                    volumeDelta >= 0 ? "text-primary" : "text-destructive"
                  }`}
                >
                  {volumeDelta >= 0 ? "+" : ""}
                  {volumeDelta.toLocaleString()} kg
                  {volumePercent != null && ` (${volumePercent >= 0 ? "+" : ""}${volumePercent}%)`}
                </span>
              )}
            </div>
          </div>

          {/* Consistency */}
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Weekly Consistency
            </h4>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{data.weeklyCompleted}</span>
                <span className="text-muted-foreground"> of {data.weeklyTotal} sessions this week</span>
              </span>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5 pt-1">
              {Array.from({ length: data.weeklyTotal }, (_, i) => (
                <div
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full ${
                    i < data.weeklyCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <Button
          variant="hero"
          className="w-full mt-4"
          onClick={() => {
            onOpenChange(false);
            navigate(-1);
          }}
        >
          <Check className="h-4 w-4 mr-2" />
          Done
        </Button>
      </DialogContent>
    </Dialog>
  );
}
