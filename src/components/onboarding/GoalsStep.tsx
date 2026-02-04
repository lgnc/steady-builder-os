import { Target, Sparkles } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface GoalsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const primaryGoals = [
  { value: "fat_loss", label: "Fat Loss", description: "Reduce body fat, maintain muscle" },
  { value: "recomposition", label: "Recomposition", description: "Lose fat and build muscle" },
  { value: "muscle_gain", label: "Muscle / Strength", description: "Build size and strength" },
  { value: "athletic", label: "Athletic Performance", description: "Speed, power, conditioning" },
];

const secondaryGoals = [
  { value: "energy", label: "Energy" },
  { value: "confidence", label: "Confidence" },
  { value: "structure", label: "Structure" },
  { value: "stress", label: "Stress Regulation" },
  { value: "cognitive", label: "Cognitive Performance" },
];

export function GoalsStep({ data, updateData }: GoalsStepProps) {
  const togglePrimaryGoal = (goal: string) => {
    const current = data.primaryGoals;
    if (current.includes(goal)) {
      updateData({ primaryGoals: current.filter((g) => g !== goal) });
    } else if (current.length < 2) {
      updateData({ primaryGoals: [...current, goal] });
    }
  };

  const toggleSecondaryGoal = (goal: string) => {
    const current = data.secondaryGoals;
    if (current.includes(goal)) {
      updateData({ secondaryGoals: current.filter((g) => g !== goal) });
    } else if (current.length < 2) {
      updateData({ secondaryGoals: [...current, goal] });
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Your Goals</h2>
        <p className="text-muted-foreground">
          Focus matters. Select up to 2 in each category.
        </p>
      </div>

      {/* Primary Goals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Primary Goals (max 2)</h3>
        </div>
        
        <div className="space-y-2">
          {primaryGoals.map((goal) => (
            <button
              key={goal.value}
              onClick={() => togglePrimaryGoal(goal.value)}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-all duration-200",
                data.primaryGoals.includes(goal.value)
                  ? "bg-primary/10 border-primary"
                  : "bg-muted/30 border-border hover:bg-muted/50",
                data.primaryGoals.length >= 2 && !data.primaryGoals.includes(goal.value)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              )}
              disabled={data.primaryGoals.length >= 2 && !data.primaryGoals.includes(goal.value)}
            >
              <div className="space-y-1">
                <h4 className="font-medium">{goal.label}</h4>
                <p className="text-sm text-muted-foreground">{goal.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Secondary Goals */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Secondary Goals (max 2)</h3>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {secondaryGoals.map((goal) => (
            <button
              key={goal.value}
              onClick={() => toggleSecondaryGoal(goal.value)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                data.secondaryGoals.includes(goal.value)
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
                data.secondaryGoals.length >= 2 && !data.secondaryGoals.includes(goal.value)
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              )}
              disabled={data.secondaryGoals.length >= 2 && !data.secondaryGoals.includes(goal.value)}
            >
              {goal.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
