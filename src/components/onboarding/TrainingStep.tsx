import { Dumbbell } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface TrainingStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const experienceTiers = [
  {
    value: "absolute_amateur",
    label: "Absolute Amateur",
    description: "New to structured training. Building fundamentals.",
    details: "Low volume, basic movements, focus on form",
  },
  {
    value: "beginner",
    label: "Beginner",
    description: "Some experience. Ready for progressive overload.",
    details: "Moderate volume, compound focus, linear progression",
  },
  {
    value: "intermediate",
    label: "Intermediate",
    description: "1-3 years consistent training. Solid foundation.",
    details: "Higher volume, periodization, accessory work",
  },
  {
    value: "advanced",
    label: "Advanced",
    description: "3+ years. Strong base. Ready for intensity.",
    details: "High volume, advanced techniques, peak training",
  },
] as const;

export function TrainingStep({ data, updateData }: TrainingStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Training Experience</h2>
        <p className="text-muted-foreground">
          Be honest. This scales your program appropriately.
        </p>
      </div>

      <div className="space-y-3">
        {experienceTiers.map((tier) => (
          <button
            key={tier.value}
            onClick={() => updateData({ experienceTier: tier.value })}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all duration-200",
              data.experienceTier === tier.value
                ? "bg-primary/10 border-primary"
                : "bg-muted/30 border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  data.experienceTier === tier.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Dumbbell className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">{tier.label}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <p className="text-xs text-muted-foreground/70 mt-2">{tier.details}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
