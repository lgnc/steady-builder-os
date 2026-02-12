import { useState } from "react";
import { format, addDays, startOfWeek, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { MacroSummary } from "./MacroSummary";
import { MealCard, Meal } from "./MealCard";

interface DailyPlanViewProps {
  planData: any;
  weekStart: string;
  profile: {
    calorie_target: number;
    protein_g: number;
    fat_g: number;
    carb_g: number;
  };
  completions: Record<string, boolean>;
  favouriteSlots: Set<string>;
  swappingSlot: string | null;
  onToggleComplete: (date: string, slot: string, completed: boolean) => void;
  onSwapMeal: (dayIndex: number, slot: string) => void;
  onToggleFavourite: (meal: Meal) => void;
  onCustomise?: () => void;
}

export function DailyPlanView({
  planData,
  weekStart,
  profile,
  completions,
  favouriteSlots,
  swappingSlot,
  onToggleComplete,
  onSwapMeal,
  onToggleFavourite,
  onCustomise,
}: DailyPlanViewProps) {
  const monday = startOfWeek(new Date(weekStart + "T00:00:00"), { weekStartsOn: 1 });
  const todayDayIndex = (() => {
    const now = new Date();
    const diff = Math.floor((now.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, Math.min(7, diff + 1));
  })();

  const [selectedDay, setSelectedDay] = useState(todayDayIndex);
  const days = planData?.days || [];
  const currentDay = days.find((d: any) => d.day === selectedDay);
  const meals: Meal[] = currentDay?.meals || [];

  const dateForDay = (dayIndex: number) => addDays(monday, dayIndex - 1);
  const dateStr = format(dateForDay(selectedDay), "yyyy-MM-dd");

  // Calculate daily consumed macros (from completed meals)
  const consumed = meals.reduce(
    (acc, m) => {
      const key = `${dateStr}_${m.slot}`;
      if (completions[key]) {
        acc.calories += m.calories;
        acc.protein += m.protein_g;
        acc.carbs += m.carb_g;
        acc.fat += m.fat_g;
      }
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Day selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const date = dateForDay(d);
          const isTodayDate = isToday(date);
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={cn(
                "flex flex-col items-center min-w-[3rem] py-2 px-2 rounded-lg text-xs transition-all duration-200",
                selectedDay === d
                  ? "bg-primary/10 border border-primary text-foreground"
                  : "bg-muted/30 border border-transparent text-muted-foreground hover:bg-muted/50",
                isTodayDate && selectedDay !== d && "border-primary/30"
              )}
            >
              <span className="font-medium">{format(date, "EEE")}</span>
              <span className={cn("mt-0.5", isTodayDate && "text-primary font-semibold")}>
                {format(date, "d")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Macro summary */}
      <MacroSummary
        calories={consumed.calories}
        calorieTarget={profile.calorie_target}
        protein={consumed.protein}
        proteinTarget={profile.protein_g}
        carbs={consumed.carbs}
        carbTarget={profile.carb_g}
        fat={consumed.fat}
        fatTarget={profile.fat_g}
      />

      {/* Meals */}
      <div className="space-y-3">
        {meals.map((meal) => {
          const key = `${dateStr}_${meal.slot}`;
          return (
            <MealCard
              key={meal.slot}
              meal={meal}
              completed={!!completions[key]}
              isFavourite={favouriteSlots.has(`${meal.slot}_${meal.name}`)}
              swapping={swappingSlot === meal.slot}
              onToggleComplete={() =>
                onToggleComplete(dateStr, meal.slot, !completions[key])
              }
              onSwap={() => onSwapMeal(selectedDay, meal.slot)}
              onToggleFavourite={() => onToggleFavourite(meal)}
              onCustomise={onCustomise}
            />
          );
        })}
        {meals.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            No meals for this day.
          </p>
        )}
      </div>
    </div>
  );
}
