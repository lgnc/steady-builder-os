import { format, addDays, startOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { Check, X, ShoppingCart } from "lucide-react";

interface WeeklyOverviewProps {
  planData: any;
  weekStart: string;
  completions: Record<string, boolean>;
  mealsPerDay: number;
  onOpenShoppingList: () => void;
}

export function WeeklyOverview({
  planData,
  weekStart,
  completions,
  mealsPerDay,
  onOpenShoppingList,
}: WeeklyOverviewProps) {
  const monday = startOfWeek(new Date(weekStart + "T00:00:00"), { weekStartsOn: 0 });
  const days = planData?.days || [];

  const dayStats = [1, 2, 3, 4, 5, 6, 7].map((d) => {
    const date = addDays(monday, d - 1);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayData = days.find((day: any) => day.day === d);
    const mealCount = dayData?.meals?.length || 0;
    let completedCount = 0;
    (dayData?.meals || []).forEach((m: any) => {
      const key = `${dateStr}_${m.slot}`;
      if (completions[key]) completedCount++;
    });

    return {
      day: d,
      date,
      dateStr,
      mealCount,
      completedCount,
      allDone: mealCount > 0 && completedCount === mealCount,
    };
  });

  const totalMeals = dayStats.reduce((s, d) => s + d.mealCount, 0);
  const totalCompleted = dayStats.reduce((s, d) => s + d.completedCount, 0);
  const complianceScore = totalMeals > 0 ? Math.round((totalCompleted / totalMeals) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="card-ritual text-center space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Compliance</p>
        <p className="text-4xl font-bold text-foreground">{complianceScore}%</p>
        <p className="text-xs text-muted-foreground">
          {totalCompleted} of {totalMeals} meals followed
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-2">
        {dayStats.map((d) => (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{format(d.date, "EEE")}</span>
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                d.allDone
                  ? "bg-primary/10 border-primary/30"
                  : d.completedCount > 0
                  ? "bg-warning/10 border-warning/30"
                  : "bg-muted/30 border-border"
              )}
            >
              {d.allDone ? (
                <Check className="h-4 w-4 text-primary" />
              ) : d.completedCount > 0 ? (
                <span className="text-xs font-medium text-warning">
                  {d.completedCount}/{d.mealCount}
                </span>
              ) : (
                <X className="h-4 w-4 text-muted-foreground/40" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Shopping list button */}
      <button
        onClick={onOpenShoppingList}
        className="w-full card-ritual flex items-center justify-center gap-2 py-3 hover:bg-muted/50 transition-colors"
      >
        <ShoppingCart className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">View Shopping List</span>
      </button>
    </div>
  );
}
