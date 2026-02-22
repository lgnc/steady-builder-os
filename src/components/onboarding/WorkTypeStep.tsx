import { Briefcase, HardHat, Plane, Clock } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface WorkTypeStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const workTypes = [
  {
    value: "standard",
    label: "Standard Hours",
    icon: Briefcase,
    description: "Fixed schedule — e.g. 9 to 5, Monday to Friday",
    detail: "You work roughly the same hours each week",
  },
  {
    value: "shift_work",
    label: "Shift Work",
    icon: Clock,
    description: "Rotating or irregular shifts — nursing, paramedic, hospitality",
    detail: "Your hours change week to week — you'll input shifts weekly",
  },
  {
    value: "fifo",
    label: "FIFO / Roster",
    icon: Plane,
    description: "Fly-in fly-out or block rosters — mining, oil & gas, remote sites",
    detail: "You alternate between on-site and home periods",
  },
] as const;

export function WorkTypeStep({ data, updateData }: WorkTypeStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">How Do You Work?</h2>
        <p className="text-muted-foreground">
          This shapes your entire onboarding — sleep, schedule, and training will all adapt to your answer.
        </p>
      </div>

      <div className="space-y-3">
        {workTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => updateData({ workType: type.value as OnboardingData["workType"] })}
            className={cn(
              "w-full text-left p-4 rounded-lg border transition-all duration-200",
              data.workType === type.value
                ? "bg-primary/10 border-primary"
                : "bg-muted/30 border-border hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "p-2 rounded-lg shrink-0",
                  data.workType === type.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <type.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <h3 className="font-medium">{type.label}</h3>
                <p className="text-sm text-muted-foreground">{type.description}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">{type.detail}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
