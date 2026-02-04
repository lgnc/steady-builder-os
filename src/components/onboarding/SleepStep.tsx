import { Clock, Moon, AlertCircle } from "lucide-react";
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

export function SleepStep({ data, updateData, showWarning, onDismissWarning }: SleepStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Sleep & Recovery</h2>
        <p className="text-muted-foreground">
          Sleep is the foundation. Everything else depends on this.
        </p>
      </div>

      <div className="space-y-6">
        {/* Wake Time */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            What time do you want to wake up?
          </label>
          <Input
            type="time"
            value={data.wakeTime}
            onChange={(e) => updateData({ wakeTime: e.target.value })}
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

        {/* Calculated Bedtime */}
        <div className="card-ritual mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Your bedtime</span>
            <span className="text-xl font-semibold">{data.bedtime}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Calculated from your wake time and sleep duration
          </p>
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
