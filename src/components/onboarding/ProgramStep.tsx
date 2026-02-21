import { useState } from "react";
import { Calendar, Zap, Target, Clock, ChevronDown } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { cn } from "@/lib/utils";

interface ProgramStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

interface ProgramDay {
  name: string;
  focus: string;
  estimatedMins: number;
}

const programs = [
  {
    value: "3_day_strength",
    label: "3-Day Strength & Hypertrophy",
    days: 3,
    type: "Strength",
    description: "Full body focus. Maximum efficiency.",
    ideal: "Busy schedules, beginners",
    schedule: [
      { name: "Day 1 — Full Body Power", focus: "Compound Movements", estimatedMins: 55 },
      { name: "Day 2 — Full Body Strength", focus: "Strength Focus", estimatedMins: 55 },
      { name: "Day 3 — Full Body Hypertrophy", focus: "Volume Focus", estimatedMins: 50 },
    ] as ProgramDay[],
  },
  {
    value: "4_day_strength",
    label: "4-Day Strength & Hypertrophy",
    days: 4,
    type: "Strength",
    description: "Upper/lower split. Balanced approach.",
    ideal: "Most lifters, intermediate",
    schedule: [
      { name: "Day 1 — Upper (Push Focus)", focus: "Chest / Shoulders / Triceps", estimatedMins: 60 },
      { name: "Day 2 — Lower (Quad Focus)", focus: "Quads / Glutes", estimatedMins: 55 },
      { name: "Day 3 — Upper (Pull Focus)", focus: "Back / Biceps", estimatedMins: 60 },
      { name: "Day 4 — Lower (Posterior Focus)", focus: "Hamstrings / Glutes", estimatedMins: 55 },
    ] as ProgramDay[],
  },
  {
    value: "4_day_hybrid",
    label: "4-Day Hybrid",
    days: 4,
    type: "Hybrid",
    description: "Strength + conditioning. Athletic focus.",
    ideal: "Performance, fat loss",
    schedule: [
      { name: "Day 1 — Upper Strength", focus: "Push / Pull Strength", estimatedMins: 60 },
      { name: "Day 2 — Conditioning", focus: "Metabolic Work", estimatedMins: 40 },
      { name: "Day 3 — Lower Strength", focus: "Leg Strength", estimatedMins: 55 },
      { name: "Day 4 — Athletic", focus: "Power & Agility", estimatedMins: 45 },
    ] as ProgramDay[],
  },
  {
    value: "5_day_hybrid",
    label: "5-Day Hybrid Performance",
    days: 5,
    type: "Hybrid",
    description: "Complete athletic development.",
    ideal: "Advanced, serious athletes",
    schedule: [
      { name: "Day 1 — Push", focus: "Chest / Shoulders / Triceps", estimatedMins: 60 },
      { name: "Day 2 — Pull", focus: "Back / Biceps", estimatedMins: 55 },
      { name: "Day 3 — Conditioning", focus: "Metabolic Work", estimatedMins: 40 },
      { name: "Day 4 — Legs", focus: "Full Leg Development", estimatedMins: 55 },
      { name: "Day 5 — Athletic", focus: "Power & Sport", estimatedMins: 45 },
    ] as ProgramDay[],
  },
] as const;

export function ProgramStep({ data, updateData }: ProgramStepProps) {
  const [expandedProgram, setExpandedProgram] = useState<string | null>(null);

  const toggleExpand = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedProgram(expandedProgram === value ? null : value);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Select Your Program</h2>
        <p className="text-muted-foreground">
          This is locked for 8 weeks. No program hopping.
        </p>
      </div>

      <div className="space-y-3">
        {programs.map((program) => {
          const isExpanded = expandedProgram === program.value;
          return (
            <div key={program.value} className="space-y-0">
              <button
                onClick={() => updateData({ selectedProgram: program.value })}
                className={cn(
                  "w-full text-left p-4 rounded-lg border transition-all duration-200",
                  isExpanded && "rounded-b-none",
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

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {program.days} days/week
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        8 weeks
                      </span>
                      <span className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" />
                        {program.ideal}
                      </span>
                    </div>
                    <button
                      onClick={(e) => toggleExpand(program.value, e)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Show program details"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div
                  className={cn(
                    "border border-t-0 rounded-b-lg p-3 space-y-2",
                    data.selectedProgram === program.value
                      ? "border-primary bg-primary/5"
                      : "border-border bg-muted/20"
                  )}
                >
                  {program.schedule.map((day, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1.5 px-2 rounded bg-background/50"
                    >
                      <div>
                        <p className="text-sm font-medium">{day.name}</p>
                        <p className="text-xs text-muted-foreground">{day.focus}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        ~{day.estimatedMins} min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
