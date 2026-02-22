import { Briefcase, Clock, Sun, Moon, Sunset, Dumbbell, AlertCircle } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface WorkStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const trainingWindows = [
  { value: "morning", label: "Morning", icon: Sun, description: "Before work" },
  { value: "afternoon", label: "Midday", icon: Sunset, description: "Lunch break" },
  { value: "evening", label: "Evening", icon: Moon, description: "After work" },
] as const;

const daysOfWeek = [
  { value: "sunday", label: "Sun" },
  { value: "monday", label: "Mon" },
  { value: "tuesday", label: "Tue" },
  { value: "wednesday", label: "Wed" },
  { value: "thursday", label: "Thu" },
  { value: "friday", label: "Fri" },
  { value: "saturday", label: "Sat" },
];


export function WorkStep({ data, updateData }: WorkStepProps) {
  const toggleWorkDay = (day: string) => {
    const newWorkDays = data.workDays.includes(day)
      ? data.workDays.filter((d) => d !== day)
      : [...data.workDays, day];
    updateData({ workDays: newWorkDays });
  };

  const toggleRestDay = (day: string) => {
    const newRestDays = data.restDays.includes(day)
      ? data.restDays.filter((d) => d !== day)
      : [...data.restDays, day];
    // Remove from training days if adding as rest day
    const newTrainingDays = data.preferredTrainingDays.filter((d) => !newRestDays.includes(d));
    updateData({ restDays: newRestDays, preferredTrainingDays: newTrainingDays });
  };

  const toggleTrainingDay = (day: string) => {
    // Prevent selecting a rest day as training day
    if (data.restDays.includes(day)) return;
    const newTrainingDays = data.preferredTrainingDays.includes(day)
      ? data.preferredTrainingDays.filter((d) => d !== day)
      : [...data.preferredTrainingDays, day];
    updateData({ preferredTrainingDays: newTrainingDays });
  };

  const isStandard = data.workType === "standard";
  const isShiftWork = data.workType === "shift_work";
  const isFifo = data.workType === "fifo";

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Work & Availability</h2>
        <p className="text-muted-foreground">
          {isStandard
            ? "Set your typical work hours so we can build around them."
            : isShiftWork
            ? "Since your hours change, we'll focus on your training preferences and rest days."
            : "We'll set up your home schedule. You can toggle to on-site mode later."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Work Hours — only for standard */}
        {isStandard && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-primary" />
              Work hours
            </label>
            <div className="flex items-center gap-3">
              <Input
                type="time"
                value={data.workStart}
                onChange={(e) => updateData({ workStart: e.target.value })}
                className="h-12 bg-input border-border text-foreground"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="time"
                value={data.workEnd}
                onChange={(e) => updateData({ workEnd: e.target.value })}
                className="h-12 bg-input border-border text-foreground"
              />
            </div>
          </div>
        )}

        {/* Flexible Work — only for standard */}
        {isStandard && (
          <div className="flex items-center justify-between py-3 px-4 bg-muted/50 rounded-lg">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">Flexible schedule</span>
              <p className="text-xs text-muted-foreground">I can adjust my hours</p>
            </div>
            <Switch
              checked={data.flexibleWork}
              onCheckedChange={(checked) => updateData({ flexibleWork: checked })}
            />
          </div>
        )}

        {/* Work Days — for standard workers */}
        {isStandard && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="h-4 w-4 text-primary" />
              Which days do you work?
            </label>
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleWorkDay(day.value)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    data.workDays.includes(day.value)
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Select the days you typically work these hours.</p>
          </div>
        )}

        {/* Shift Work info */}
        {isShiftWork && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              📋 Each week, you'll be able to input your shifts in the calendar.
              We'll build your training and rituals around whatever hours you're working that week.
            </p>
          </div>
        )}

        {/* FIFO home-period note */}
        {isFifo && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              🏠 These preferences apply to your <span className="font-medium text-foreground">home period</span>.
              Your on-site details were captured in the previous step.
            </p>
          </div>
        )}

        {/* Training Window */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Preferred training time
          </label>
          <div className="grid grid-cols-3 gap-2">
            {trainingWindows.map((window) => (
              <button
                key={window.value}
                onClick={() => updateData({ preferredTrainingWindow: window.value })}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200",
                  data.preferredTrainingWindow === window.value
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <window.icon className="h-5 w-5" />
                <span className="text-xs font-medium">{window.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rest Days */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Rest days (no training)</label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => (
              <button
                key={day.value}
                onClick={() => toggleRestDay(day.value)}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  data.restDays.includes(day.value)
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Preferred Training Days */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Dumbbell className="h-4 w-4 text-primary" />
            Preferred training days
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeek.map((day) => {
              const isRestDay = data.restDays.includes(day.value);
              const isSelected = data.preferredTrainingDays.includes(day.value);
              return (
                <button
                  key={day.value}
                  onClick={() => toggleTrainingDay(day.value)}
                  disabled={isRestDay}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    isSelected
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : isRestDay
                      ? "bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">Days marked as rest days are excluded.</p>
        </div>
      </div>
    </div>
  );
}
