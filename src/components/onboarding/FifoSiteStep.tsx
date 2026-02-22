import { Clock, Moon, Sun } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FifoSiteStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

const shiftLengths = [
  { value: 10, label: "10 hours" },
  { value: 12, label: "12 hours" },
];

const shiftTypes = [
  { value: "days", label: "Days" },
  { value: "nights", label: "Nights" },
  { value: "both", label: "Both" },
];

export function FifoSiteStep({ data, updateData }: FifoSiteStepProps) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">On-Site Details</h2>
        <p className="text-muted-foreground">
          Tell us about your site roster so we can adapt your routine when you're away.
        </p>
      </div>

      <div className="space-y-6">
        {/* Shift Length */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            On-site shift length
          </label>
          <div className="grid grid-cols-2 gap-2">
            {shiftLengths.map((sl) => (
              <button
                key={sl.value}
                onClick={() => updateData({ fifoShiftLength: sl.value })}
                className={cn(
                  "p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                  data.fifoShiftLength === sl.value
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {sl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Shift Type */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <Sun className="h-4 w-4 text-primary" />
            On-site shift type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {shiftTypes.map((st) => (
              <button
                key={st.value}
                onClick={() => updateData({ fifoShiftType: st.value })}
                className={cn(
                  "p-3 rounded-lg border text-sm font-medium transition-all duration-200",
                  data.fifoShiftType === st.value
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                )}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Context note */}
        <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm text-muted-foreground">
            🔄 We'll build your <span className="font-medium text-foreground">home routine</span> by default.
            You can toggle to <span className="font-medium text-foreground">on-site mode</span> from the calendar
            whenever you head to site.
          </p>
        </div>
      </div>
    </div>
  );
}
