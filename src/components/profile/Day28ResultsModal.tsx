import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ProgressBar } from "@/components/ui/progress-bar";
import { format } from "date-fns";
import {
  Dumbbell,
  CheckCircle2,
  Utensils,
  Scale,
  BookOpen,
  Flame,
  X,
} from "lucide-react";

interface SavedReview {
  workouts_completed: number | null;
  avg_habits_percent: number | null;
  avg_nutrition_percent: number | null;
  start_weight: number | null;
  end_weight: number | null;
  journal_entries: number | null;
  longest_streak: number | null;
  reflection_text: string | null;
  completed_at: string | null;
}

interface Day28ResultsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: SavedReview | null;
}

export function Day28ResultsModal({ open, onOpenChange, data }: Day28ResultsModalProps) {
  if (!data) return null;

  const weightDelta =
    data.start_weight != null && data.end_weight != null
      ? (data.end_weight - data.start_weight).toFixed(1)
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
                {data.completed_at
                  ? `Completed ${format(new Date(data.completed_at), "d MMM yyyy")}`
                  : "Your results"}
              </p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard
                icon={Dumbbell}
                label="Workouts"
                value={String(data.workouts_completed ?? 0)}
                sub="sessions completed"
              />
              <ResultCard
                icon={CheckCircle2}
                label="Habits"
                value={`${data.avg_habits_percent ?? 0}%`}
                sub="avg daily completion"
                progress={data.avg_habits_percent ?? 0}
              />
              <ResultCard
                icon={Utensils}
                label="Nutrition"
                value={`${data.avg_nutrition_percent ?? 0}%`}
                sub="compliance"
                progress={data.avg_nutrition_percent ?? 0}
              />
              <ResultCard
                icon={Scale}
                label="Weight"
                value={
                  weightDelta != null
                    ? `${Number(weightDelta) > 0 ? "+" : ""}${weightDelta} kg`
                    : "—"
                }
                sub={
                  data.start_weight != null && data.end_weight != null
                    ? `${data.start_weight} → ${data.end_weight} kg`
                    : "No weigh-ins logged"
                }
              />
              <ResultCard
                icon={BookOpen}
                label="Journal"
                value={String(data.journal_entries ?? 0)}
                sub="entries written"
              />
              <ResultCard
                icon={Flame}
                label="Best Streak"
                value={String(data.longest_streak ?? 0)}
                sub="days"
              />
            </div>

            {data.reflection_text && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Your reflection</p>
                <div className="card-stat p-4">
                  <p className="text-sm text-foreground leading-relaxed italic">
                    "{data.reflection_text}"
                  </p>
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground italic text-center py-2">
              This is what structure does. You don't need motivation — you need a system.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultCard({
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
      {progress != null && <ProgressBar value={progress} />}
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
