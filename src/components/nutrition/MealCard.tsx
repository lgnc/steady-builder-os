import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, Heart, RefreshCw, Check, Clock, Loader2, Lock } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export interface Ingredient {
  name: string;
  amount_grams: number;
  raw_or_cooked: "raw" | "cooked";
  category: string;
  display_quantity?: number;
  display_unit?: string;
}

export interface Meal {
  slot: string;
  name: string;
  calories: number;
  protein_g: number;
  carb_g: number;
  fat_g: number;
  cook_time_minutes: number;
  ingredients: Ingredient[];
  steps: string[];
}

interface MealCardProps {
  meal: Meal;
  completed: boolean;
  isFavourite: boolean;
  swapping: boolean;
  onToggleComplete: () => void;
  onSwap: () => void;
  onToggleFavourite: () => void;
  onCustomise?: () => void;
}

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  meal_4: "Meal 4",
  meal_5: "Meal 5",
};

export function MealCard({
  meal,
  completed,
  isFavourite,
  swapping,
  onToggleComplete,
  onSwap,
  onToggleFavourite,
  onCustomise,
}: MealCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn("card-ritual transition-all duration-200", completed && "opacity-60")}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Checkbox
          checked={completed}
          onCheckedChange={onToggleComplete}
          className="mt-1 shrink-0"
        />

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left"
        >
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {SLOT_LABELS[meal.slot] || meal.slot}
          </p>
          <p className={cn("text-sm font-medium mt-0.5", completed && "line-through")}>
            {meal.name}
          </p>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span>{meal.calories} kcal</span>
            <span>P {meal.protein_g}g</span>
            <span>C {meal.carb_g}g</span>
            <span>F {meal.fat_g}g</span>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onToggleFavourite}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                isFavourite ? "fill-destructive text-destructive" : "text-muted-foreground"
              )}
            />
          </button>
          <button
            onClick={onSwap}
            disabled={swapping}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            {swapping ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {onCustomise && (
            <button
              onClick={onCustomise}
              className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
              title="Customise — Pro"
            >
              <Lock className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded recipe */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{meal.cook_time_minutes} min cook time</span>
          </div>

          {/* Ingredients */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground uppercase tracking-wider">Ingredients</p>
            <ul className="space-y-1">
              {meal.ingredients.map((ing, i) => (
                <li key={i} className="text-sm text-muted-foreground flex justify-between">
                  <span>{ing.name}</span>
                  <span className="text-xs">
                    {ing.display_unit && ing.display_unit !== "g"
                      ? `${ing.display_quantity} ${ing.display_unit}`
                      : <>{ing.amount_grams}g{" "}<span className="text-muted-foreground/60">({ing.raw_or_cooked})</span></>
                    }
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground uppercase tracking-wider">Method</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {meal.steps.map((step, i) => (
                <li key={i} className="text-sm text-muted-foreground">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
