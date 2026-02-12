import { CalendarClock } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface StrategyStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const daysOfWeek = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export function StrategyStep({ data, updateData }: StrategyStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Sunday Planning Ritual</h2>
        <p className="text-muted-foreground">
          Pick one day each week for a 45-minute planning ritual. You'll map out
          training, meals, meetings, energy management — the entire week ahead.
          Phone on Do Not Disturb, full focus.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <CalendarClock className="h-5 w-5 text-amber-400 shrink-0" />
          <p className="text-sm text-muted-foreground">
            This 45-minute block will appear on your calendar each week. You can
            drag it to a different time if the default doesn't suit you.
          </p>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium">Best day for your Planning Ritual</label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.value}
                onClick={() => updateData({ strategyDay: day.value })}
                className={cn(
                  "px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  data.strategyDay === day.value
                    ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
