import { Calendar, Zap, Target } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface ProgramStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const programs = [
  {
    value: "3_day_strength",
    label: "3-Day Strength & Hypertrophy",
    days: 3,
    type: "Strength",
    description: "Full body focus. Maximum efficiency.",
    ideal: "Busy schedules, beginners",
  },
  {
    value: "4_day_strength",
    label: "4-Day Strength & Hypertrophy",
    days: 4,
    type: "Strength",
    description: "Upper/lower split. Balanced approach.",
    ideal: "Most lifters, intermediate",
  },
  {
    value: "4_day_hybrid",
    label: "4-Day Hybrid",
    days: 4,
    type: "Hybrid",
    description: "Strength + conditioning. Athletic focus.",
    ideal: "Performance, fat loss",
  },
  {
    value: "5_day_hybrid",
    label: "5-Day Hybrid Performance",
    days: 5,
    type: "Hybrid",
    description: "Complete athletic development.",
    ideal: "Advanced, serious athletes",
  },
] as const;

export function ProgramStep({ data, updateData }: ProgramStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Select Your Program</h2>
        <p className="text-muted-foreground">
          This is locked for 8 weeks. No program hopping.
        </p>
      </div>

      <div className="space-y-3">
        {programs.map((program) => (
          <button
            key={program.value}
            onClick={() => updateData({ selectedProgram: program.value })}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all duration-200",
              data.selectedProgram === program.value
                ? "bg-primary/10 border-primary"
                : "bg-muted/30 border-border hover:bg-muted/50"
            )}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{program.label}</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      program.type === "Hybrid"
                        ? "bg-primary/20 text-primary"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {program.type}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">{program.description}</p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {program.days} days/week
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3.5 w-3.5" />
                  {program.ideal}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="card-ritual">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Your program will scale based on your experience tier. Trust the process for 8 weeks.
          </p>
        </div>
      </div>
    </div>
  );
}
