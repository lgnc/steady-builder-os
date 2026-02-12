import { useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Utensils, Loader2 } from "lucide-react";

interface NutritionSetupProps {
  onboardingDietaryChoices: string[];
  onboardingAllergies: string;
  onGenerate: (mealsPerDay: number, dietaryFilters: string[], allergies: string) => void;
  loading: boolean;
}

const MEAL_COUNTS = [2, 3, 4, 5];

const DIETARY_FILTERS = [
  "Vegetarian",
  "Vegan",
  "Halal",
  "Dairy-free",
  "Gluten-free",
];

export function NutritionSetup({
  onboardingDietaryChoices,
  onboardingAllergies,
  onGenerate,
  loading,
}: NutritionSetupProps) {
  const [mealsPerDay, setMealsPerDay] = useState(3);
  const [selectedFilters, setSelectedFilters] = useState<string[]>(
    onboardingDietaryChoices.filter((c) =>
      DIETARY_FILTERS.map((f) => f.toLowerCase()).includes(c.toLowerCase())
    )
  );
  const [allergies, setAllergies] = useState(onboardingAllergies);

  const toggleFilter = (filter: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter]
    );
  };

  return (
    <div className="flex flex-col items-center px-6 py-8 space-y-8">
      <div className="text-center space-y-3">
        <div className="p-4 rounded-full bg-primary/20 w-20 h-20 mx-auto flex items-center justify-center">
          <Utensils className="h-9 w-9 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Set Up Your Nutrition</h1>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">
          We'll generate a weekly meal plan tailored to your targets.
        </p>
      </div>

      {/* Meal count */}
      <div className="w-full max-w-sm space-y-3">
        <Label className="text-sm text-muted-foreground">Meals per day</Label>
        <div className="grid grid-cols-4 gap-2">
          {MEAL_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => setMealsPerDay(count)}
              className={cn(
                "p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                mealsPerDay === count
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {count}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {mealsPerDay === 2
            ? "Breakfast + Lunch"
            : mealsPerDay === 3
            ? "Breakfast + Lunch + Dinner"
            : mealsPerDay === 4
            ? "Breakfast + Lunch + Dinner + Extra Meal"
            : "Breakfast + Lunch + Dinner + 2 Extra Meals"}
        </p>
      </div>

      {/* Dietary filters */}
      <div className="w-full max-w-sm space-y-3">
        <Label className="text-sm text-muted-foreground">Dietary filters</Label>
        <div className="flex flex-wrap gap-2">
          {DIETARY_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                selectedFilters.includes(filter)
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div className="w-full max-w-sm space-y-2">
        <Label className="text-sm text-muted-foreground">Allergies & sensitivities</Label>
        <Input
          value={allergies}
          onChange={(e) => setAllergies(e.target.value)}
          placeholder="e.g. Nuts, shellfish, dairy"
          className="bg-muted/30"
        />
      </div>

      {/* Generate */}
      <Button
        variant="hero"
        className="w-full max-w-sm gap-2"
        onClick={() => onGenerate(mealsPerDay, selectedFilters, allergies)}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Generating Your Plan...
          </>
        ) : (
          "Generate My Plan"
        )}
      </Button>
    </div>
  );
}
