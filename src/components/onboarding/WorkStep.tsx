import { Briefcase, Clock, Sun, Moon, Sunset } from "lucide-react";
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
  const toggleRestDay = (day: string) => {
    const newRestDays = data.restDays.includes(day)
      ? data.restDays.filter((d) => d !== day)
      : [...data.restDays, day];
    updateData({ restDays: newRestDays });
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

        {/* Shift Work info */}
        {isShiftWork && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              📋 Each week, you'll be able to input your shifts in the calendar.
              We'll build your training and rituals around whatever hours you're working that week.
            </p>
          </div>
        )}

        {/* FIFO info */}
        {isFifo && (
          <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
            <p className="text-sm text-muted-foreground">
              🔄 We'll build your schedule for your home period first.
              You can toggle between <span className="font-medium text-foreground">home</span> and <span className="font-medium text-foreground">on-site</span> modes
              from the calendar to switch your routine.
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
      </div>
    </div>
  );
}
