import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { OnboardingData } from "@/pages/Onboarding";

interface BuildingPlanScreenProps {
  data: OnboardingData;
  onComplete: () => void;
}

const STAGE_DURATION = 3000; // 3 seconds per stage

function getStages(data: OnboardingData): { headline: string; detail: string }[] {
  const workLabel =
    data.workStart && data.workEnd
      ? `${data.workStart}–${data.workEnd}`
      : "your work hours";

  const programLabel = data.selectedProgram
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "your program";

  const windowLabel =
    data.preferredTrainingWindow === "morning"
      ? "before work"
      : data.preferredTrainingWindow === "evening"
        ? "after work"
        : "around midday";

  const goalCount =
    (data.primaryGoals?.length ?? 0) + (data.secondaryGoals?.length ?? 0);

  return [
    {
      headline: "Analysing your schedule",
      detail: `Mapping around ${workLabel}`,
    },
    {
      headline: "Building your training blocks",
      detail: `Loading ${programLabel}`,
    },
    {
      headline: "Placing sessions around your commitments",
      detail: `Prioritising ${windowLabel} windows`,
    },
    {
      headline: "Calibrating your 8-week targets",
      detail: goalCount > 0 ? `${goalCount} goals locked in` : "Setting baselines",
    },
    {
      headline: "Finalising your operating system",
      detail: "Almost there",
    },
  ];
}

export function BuildingPlanScreen({ data, onComplete }: BuildingPlanScreenProps) {
  const stages = getStages(data);
  const [currentStage, setCurrentStage] = useState(0);
  const totalStages = stages.length;

  useEffect(() => {
    if (currentStage < totalStages - 1) {
      const timer = setTimeout(() => setCurrentStage((s) => s + 1), STAGE_DURATION);
      return () => clearTimeout(timer);
    } else {
      // Final stage — wait its duration then signal complete
      const timer = setTimeout(onComplete, STAGE_DURATION);
      return () => clearTimeout(timer);
    }
  }, [currentStage, totalStages, onComplete]);

  const progress = ((currentStage + 1) / totalStages) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{ background: "var(--gradient-glow)" }}
      />

      {/* Pulsing loader */}
      <Loader2 className="h-8 w-8 text-primary animate-spin mb-10 opacity-60" />

      {/* Stage text */}
      <div className="h-24 flex flex-col items-center justify-center relative w-full max-w-sm">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStage}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center absolute inset-0 flex flex-col items-center justify-center"
          >
            <h2 className="text-xl font-semibold text-gradient">
              {stages[currentStage].headline}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {stages[currentStage].detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 safe-bottom">
        <ProgressBar
          value={progress}
          max={100}
          className="max-w-sm mx-auto"
        />
      </div>
    </div>
  );
}
