import { cn } from "@/lib/utils";

interface MacroSummaryProps {
  calories: number;
  calorieTarget: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbTarget: number;
  fat: number;
  fatTarget: number;
}

function MacroBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">
          {current}
          <span className="text-muted-foreground">/{target}g</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MacroSummary({
  calories,
  calorieTarget,
  protein,
  proteinTarget,
  carbs,
  carbTarget,
  fat,
  fatTarget,
}: MacroSummaryProps) {
  const calPct = calorieTarget > 0 ? Math.min((calories / calorieTarget) * 100, 100) : 0;

  return (
    <div className="card-ritual space-y-3">
      {/* Calories */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-foreground">Calories</span>
          <span className="font-semibold text-foreground">
            {calories}
            <span className="text-muted-foreground font-normal"> / {calorieTarget} kcal</span>
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${calPct}%` }}
          />
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-3">
        <MacroBar label="Protein" current={protein} target={proteinTarget} color="bg-primary" />
        <MacroBar label="Carbs" current={carbs} target={carbTarget} color="bg-warning" />
        <MacroBar label="Fat" current={fat} target={fatTarget} color="bg-destructive/70" />
      </div>
    </div>
  );
}
