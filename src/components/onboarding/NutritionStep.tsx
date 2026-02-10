import { User, Target, Activity, Utensils } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NutritionStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const activityLevels = [
  { value: "sedentary", label: "Sedentary", description: "Desk job, minimal activity", multiplier: 1.2 },
  { value: "light", label: "Lightly Active", description: "Light exercise 1-3 days/week", multiplier: 1.375 },
  { value: "moderate", label: "Moderately Active", description: "Training 3-5 days/week", multiplier: 1.55 },
  { value: "very_active", label: "Very Active", description: "Intense training 6-7 days/week", multiplier: 1.725 },
] as const;

const genderOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const dietaryOptions = [
  "Omnivore", "Vegetarian", "Vegan", "Pescatarian", "Keto", "Paleo",
];

export function NutritionStep({ data, updateData }: NutritionStepProps) {
  const toggleDietaryChoice = (choice: string) => {
    const current = data.dietaryChoices || [];
    const updated = current.includes(choice)
      ? current.filter((c) => c !== choice)
      : [...current, choice];
    updateData({ dietaryChoices: updated });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Body & Nutrition</h2>
        <p className="text-muted-foreground">
          We'll calculate your targets. No guesswork.
        </p>
      </div>

      {/* Age */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Age</span>
        </div>
        <Input
          id="age"
          type="number"
          min={16}
          max={80}
          value={data.age || ""}
          onChange={(e) => updateData({ age: parseInt(e.target.value) || undefined })}
          placeholder="e.g. 28"
          className="bg-muted/30"
        />
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Gender</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateData({ gender: opt.value })}
              className={cn(
                "p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                data.gender === opt.value
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anthropometric Data */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span>Your Current Stats</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="height">Height (cm)</Label>
            <Input
              id="height"
              type="number"
              min={100}
              max={250}
              value={data.heightCm || ""}
              onChange={(e) => updateData({ heightCm: parseInt(e.target.value) || undefined })}
              placeholder="175"
              className="bg-muted/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weight">Weight (kg)</Label>
            <Input
              id="weight"
              type="number"
              min={30}
              max={300}
              step={0.1}
              value={data.weightKg || ""}
              onChange={(e) => updateData({ weightKg: parseFloat(e.target.value) || undefined })}
              placeholder="80"
              className="bg-muted/30"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetWeight">Target Weight (kg) - Optional</Label>
          <Input
            id="targetWeight"
            type="number"
            min={30}
            max={300}
            step={0.1}
            value={data.targetWeightKg || ""}
            onChange={(e) => updateData({ targetWeightKg: parseFloat(e.target.value) || undefined })}
            placeholder="75"
            className="bg-muted/30"
          />
          <p className="text-xs text-muted-foreground">Leave blank to maintain current weight</p>
        </div>
      </div>

      {/* Activity Level */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Daily Activity Level</span>
        </div>

        <div className="space-y-2">
          {activityLevels.map((level) => (
            <button
              key={level.value}
              onClick={() => updateData({ activityLevel: level.value })}
              className={cn(
                "w-full text-left p-3 rounded-lg border transition-all duration-200",
                data.activityLevel === level.value
                  ? "bg-primary/10 border-primary"
                  : "bg-muted/30 border-border hover:bg-muted/50"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-sm">{level.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{level.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Dietary Preferences */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Utensils className="h-4 w-4" />
          <span>Dietary Preferences</span>
        </div>

        <div className="space-y-3">
          <Label>Dietary choices</Label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((choice) => (
              <button
                key={choice}
                onClick={() => toggleDietaryChoice(choice)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                  (data.dietaryChoices || []).includes(choice)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
                )}
              >
                {choice}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="allergies">Allergies</Label>
          <Input
            id="allergies"
            value={data.allergies || ""}
            onChange={(e) => updateData({ allergies: e.target.value })}
            placeholder="e.g. Nuts, shellfish, dairy"
            className="bg-muted/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sensitivities">Sensitivities</Label>
          <Input
            id="sensitivities"
            value={data.sensitivities || ""}
            onChange={(e) => updateData({ sensitivities: e.target.value })}
            placeholder="e.g. Gluten, lactose"
            className="bg-muted/30"
          />
        </div>
      </div>

      {/* Preview calculated targets */}
      {data.heightCm && data.weightKg && (
        <div className="card-ritual">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Your targets will be calculated</p>
              <p className="text-xs text-muted-foreground">
                Based on your stats, goals, and training program, we'll generate your
                daily calorie and macro targets after onboarding.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
