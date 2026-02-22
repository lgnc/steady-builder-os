import { Clock, Moon, AlertCircle, Info } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "framer-motion";

interface SleepStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  showWarning: boolean;
  onDismissWarning: () => void;
}

function getCircadianHelper(weekdayWakeTime: string): string | null {
  const [hours] = weekdayWakeTime.split(":").map(Number);
  if (hours <= 5) return `If you wake at ${weekdayWakeTime} on weekdays, try not to sleep past ${String(hours + 2).padStart(2, "0")}:00 on weekends.`;
  if (hours <= 7) return `If you wake at ${weekdayWakeTime} on weekdays, try not to sleep past ${String(hours + 2).padStart(2, "0")}:00 on weekends.`;
  return null;
}

export function SleepStep({ data, updateData, showWarning, onDismissWarning }: SleepStepProps) {
  const helperText = getCircadianHelper(data.weekdayWakeTime);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {data.workType === "fifo" ? "Sleep & Recovery (Home)" : "Sleep & Recovery"}
        </h2>
        <p className="text-muted-foreground">
          {data.workType === "fifo"
            ? "Set your home-period sleep schedule. We'll handle on-site separately."
            : "Sleep is the foundation. Everything else depends on this."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Weekday Wake Time */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Weekday wake time
          </label>
          <Input
            type="time"
            value={data.weekdayWakeTime}
            onChange={(e) => updateData({ weekdayWakeTime: e.target.value })}
            className="h-12 bg-input border-border text-foreground text-lg"
          />
        </div>

        {/* Weekend Wake Time */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            Weekend wake time
          </label>
          <Input
            type="time"
            value={data.weekendWakeTime}
            onChange={(e) => updateData({ weekendWakeTime: e.target.value })}
            className="h-12 bg-input border-border text-foreground text-lg"
          />
        </div>

        {/* Sleep Duration */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Moon className="h-4 w-4 text-primary" />
            How many hours of sleep do you need?
          </label>
          <div className="space-y-3">
            <Slider
              value={[data.sleepDuration]}
              onValueChange={(value) => updateData({ sleepDuration: value[0] })}
              min={5}
              max={10}
              step={0.5}
              className="w-full"
            />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">5h</span>
              <span className="text-lg font-semibold">{data.sleepDuration}h</span>
              <span className="text-muted-foreground">10h</span>
            </div>
          </div>
        </div>

        {/* Calculated Bedtimes */}
        <div className="card-ritual mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Weekday bedtime</span>
            <span className="text-xl font-semibold">{data.bedtime}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Weekend bedtime</span>
            <span className="text-xl font-semibold">{data.weekendBedtime}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Calculated from your wake times and sleep duration
          </p>
        </div>

        {/* Circadian Rhythm Callout */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2">
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Aim to keep weekend wake times within 2 hours of weekdays to protect sleep quality and circadian rhythm.
              </p>
              {helperText && (
                <p className="text-xs text-muted-foreground/70">{helperText}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Warning */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  You need at least 7 hours.
                </p>
                <p className="text-sm text-muted-foreground">
                  Stop negotiating with fatigue. Sleep is non-negotiable.
                </p>
              </div>
            </div>
            <button
              onClick={onDismissWarning}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Adjust sleep duration →
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
