import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";

interface WeeklyProgressBarProps {
  planData: any;
  weekStart: string;
  completions: Record<string, boolean>;
}

export function WeeklyProgressBar({ planData, weekStart, completions }: WeeklyProgressBarProps) {
  const sunday = startOfWeek(new Date(weekStart + "T00:00:00"), { weekStartsOn: 0 });
  const days = planData?.days || [];

  let totalMeals = 0;
  let completedMeals = 0;

  [1, 2, 3, 4, 5, 6, 7].forEach((d) => {
    const date = addDays(sunday, d - 1);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayData = days.find((day: any) => day.day === d);
    const meals = dayData?.meals || [];
    totalMeals += meals.length;
    meals.forEach((m: any) => {
      if (completions[`${dateStr}_${m.slot}`]) completedMeals++;
    });
  });

  const percentage = totalMeals > 0 ? Math.round((completedMeals / totalMeals) * 100) : 0;

  const barColor = percentage < 50
    ? "bg-destructive"
    : percentage < 80
    ? "bg-amber-500"
    : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Weekly compliance</span>
        <span className={cn(
          "font-semibold",
          percentage < 50 ? "text-destructive" : percentage < 80 ? "text-amber-500" : "text-primary"
        )}>
          {percentage}% — {completedMeals} of {totalMeals} meals
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
