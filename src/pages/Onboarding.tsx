import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/hooks/use-toast";

// Step components
import { SleepStep } from "@/components/onboarding/SleepStep";
import { WorkTypeStep } from "@/components/onboarding/WorkTypeStep";
import { WorkStep } from "@/components/onboarding/WorkStep";
import { GymCommuteStep } from "@/components/onboarding/GymCommuteStep";
import { TrainingStep } from "@/components/onboarding/TrainingStep";
import { ProgramStep } from "@/components/onboarding/ProgramStep";
import { GoalsStep } from "@/components/onboarding/GoalsStep";
import { FrictionStep } from "@/components/onboarding/FrictionStep";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import { NutritionStep } from "@/components/onboarding/NutritionStep";
import { StrategyStep } from "@/components/onboarding/StrategyStep";

export interface OnboardingData {
  // Sleep
  wakeTime: string;
  sleepDuration: number;
  bedtime: string;
  
  // Work Type
  workType: "standard" | "shift_work" | "fifo";
  
  // Work
  workStart: string;
  workEnd: string;
  commuteMinutes: number;
  flexibleWork: boolean;
  preferredTrainingWindow: "morning" | "afternoon" | "evening";
  restDays: string[];
  
  // Gym Commute
  gymCommuteMinutes: number;
  
  // Training
  experienceTier: "absolute_amateur" | "beginner" | "intermediate" | "advanced";
  
  // Program
  selectedProgram: string;
  
  // Goals
  primaryGoals: string[];
  secondaryGoals: string[];
  
  // Friction
  frictionPoints: string[];
  stressLevel: number;
  readingHabit: number;
  journalingOpenness: number;
  nutritionConfidence: number;
  
  // Nutrition
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  activityLevel: string;

  // Strategy
  strategyDay: number;
}

const TOTAL_STEPS = 11;

const defaultData: OnboardingData = {
  wakeTime: "06:00",
  sleepDuration: 8,
  bedtime: "22:00",
  workType: "standard",
  workStart: "09:00",
  workEnd: "17:00",
  commuteMinutes: 30,
  flexibleWork: false,
  preferredTrainingWindow: "morning",
  restDays: ["sunday"],
  gymCommuteMinutes: 15,
  experienceTier: "beginner",
  selectedProgram: "3_day_strength",
  primaryGoals: [],
  secondaryGoals: [],
  frictionPoints: [],
  stressLevel: 5,
  readingHabit: 5,
  journalingOpenness: 5,
  nutritionConfidence: 5,
  activityLevel: "moderate",
  strategyDay: 0,
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [loading, setLoading] = useState(false);
  const [showSleepWarning, setShowSleepWarning] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Check if user already completed onboarding
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data: onboardingData } = await supabase
        .from("onboarding_data")
        .select("onboarding_completed, onboarding_step")
        .eq("user_id", user.id)
        .single();
      
      if (onboardingData?.onboarding_completed) {
        navigate("/dashboard");
      } else if (onboardingData?.onboarding_step) {
        setStep(onboardingData.onboarding_step);
      }
    };
    
    checkOnboarding();
  }, [user, navigate]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  // Calculate bedtime from wake time and sleep duration
  useEffect(() => {
    const [hours, minutes] = data.wakeTime.split(":").map(Number);
    const wakeMinutes = hours * 60 + minutes;
    const bedMinutes = wakeMinutes - data.sleepDuration * 60;
    const normalizedBedMinutes = bedMinutes < 0 ? bedMinutes + 24 * 60 : bedMinutes;
    
    const bedHours = Math.floor(normalizedBedMinutes / 60);
    const bedMins = normalizedBedMinutes % 60;
    const bedtime = `${bedHours.toString().padStart(2, "0")}:${bedMins.toString().padStart(2, "0")}`;
    
    setData((prev) => ({ ...prev, bedtime }));
  }, [data.wakeTime, data.sleepDuration]);

  const handleNext = async () => {
    // Validate sleep duration
    if (step === 1 && data.sleepDuration < 7) {
      setShowSleepWarning(true);
      return;
    }
    
    if (step < TOTAL_STEPS) {
      const nextStep = step + 1;
      setStep(nextStep);
      
      // Save progress
      if (user) {
        await supabase
          .from("onboarding_data")
          .update({ onboarding_step: nextStep })
          .eq("user_id", user.id);
      }
    } else {
      // Complete onboarding
      await completeOnboarding();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setShowSleepWarning(false);
    }
  };

  const completeOnboarding = async () => {
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Save all onboarding data
      const { error } = await supabase
        .from("onboarding_data")
        .update({
          wake_time: data.wakeTime,
          sleep_duration: data.sleepDuration,
          bedtime: data.bedtime,
          work_type: data.workType,
          work_start: data.workStart,
          work_end: data.workEnd,
          commute_minutes: data.commuteMinutes,
          flexible_work: data.flexibleWork,
          preferred_training_window: data.preferredTrainingWindow,
          rest_days: data.restDays,
          gym_commute_minutes: data.gymCommuteMinutes,
          experience_tier: data.experienceTier,
          selected_program: data.selectedProgram,
          primary_goals: data.primaryGoals,
          secondary_goals: data.secondaryGoals,
          friction_points: data.frictionPoints,
          stress_level: data.stressLevel,
          reading_habit: data.readingHabit,
          journaling_openness: data.journalingOpenness,
          nutrition_confidence: data.nutritionConfidence,
          height_cm: data.heightCm,
          weight_kg: data.weightKg,
          target_weight_kg: data.targetWeightKg,
          activity_level: data.activityLevel,
          strategy_day: data.strategyDay,
          onboarding_completed: true,
          onboarding_step: TOTAL_STEPS,
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      // Generate initial schedule
      await generateSchedule();

      // Seed default morning routine checklist items
      await seedDefaultChecklistItems();

      toast({
        title: "Structure installed",
        description: "Your operating system is ready.",
      });

      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    if (!user) return;

    // Fetch training days for the selected program
    const { data: trainingDaysData } = await supabase
      .from("training_days")
      .select("*")
      .eq("program_key", data.selectedProgram)
      .order("day_number");

    // Determine which weekdays are available for training (exclude rest days)
    const allDays = [0, 1, 2, 3, 4, 5, 6]; // Sunday to Saturday
    const availableDays = allDays.filter(
      (d) => !data.restDays.includes(getDayName(d).toLowerCase())
    );

    // Map training days to available weekdays
    const trainingDayMap: Record<number, string> = {}; // day_of_week -> training_day_id
    if (trainingDaysData) {
      trainingDaysData.forEach((td, idx) => {
        if (idx < availableDays.length) {
          trainingDayMap[availableDays[idx]] = td.id;
        }
      });
    }

    // Generate schedule blocks for each day
    const blocks: any[] = [];

    const morningRoutineMinutes = 45;
    const gymCommute = data.gymCommuteMinutes || 0;
    const trainingDuration = 60;

    allDays.forEach((day) => {
      const isRestDay = data.restDays.includes(getDayName(day).toLowerCase());
      const hasTraining = !isRestDay && trainingDayMap[day];
      const td = hasTraining
        ? trainingDaysData?.find((t) => t.id === trainingDayMap[day])
        : null;

      // Calculate morning routine end
      const morningRoutineEnd = addMinutes(data.wakeTime, morningRoutineMinutes);

      // Calculate training block timing based on preferred window
      let trainingStart: string | null = null;

      if (hasTraining) {
        if (data.preferredTrainingWindow === "morning") {
          // Morning: routine → commute → training → commute, all sequential
          trainingStart = gymCommute > 0
            ? addMinutes(morningRoutineEnd, gymCommute)
            : morningRoutineEnd;
        } else if (data.preferredTrainingWindow === "afternoon") {
          trainingStart = "12:00";
        } else {
          // Evening: after work + buffer
          trainingStart = gymCommute > 0
            ? addMinutes(data.workEnd, 15 + gymCommute)
            : addMinutes(data.workEnd, 15);
        }
      }

      // --- Morning Routine (starts at wake time) ---
      blocks.push({
        user_id: user.id,
        block_type: "morning_routine",
        title: "Morning Routine",
        start_time: data.wakeTime,
        end_time: morningRoutineEnd,
        day_of_week: day,
        is_locked: true,
      });

      // --- Training block (commute → training → commute) ---
      if (hasTraining && trainingStart) {
        if (gymCommute > 0) {
          blocks.push({
            user_id: user.id,
            block_type: "commute",
            title: "Drive to Gym",
            start_time: addMinutes(trainingStart, -gymCommute),
            end_time: trainingStart,
            day_of_week: day,
            is_locked: true,
          });
        }

        blocks.push({
          user_id: user.id,
          block_type: "training",
          title: td ? td.name : "Training",
          start_time: trainingStart,
          end_time: addMinutes(trainingStart, trainingDuration),
          day_of_week: day,
          is_locked: true,
          training_day_id: trainingDayMap[day],
        });

        if (gymCommute > 0) {
          blocks.push({
            user_id: user.id,
            block_type: "commute",
            title: "Drive Home",
            start_time: addMinutes(trainingStart, trainingDuration),
            end_time: addMinutes(trainingStart, trainingDuration + gymCommute),
            day_of_week: day,
            is_locked: true,
          });
        }
      }

      // --- Work block (weekdays only, for standard work type) ---
      if (day >= 1 && day <= 5 && data.workType === "standard") {
        blocks.push({
          user_id: user.id,
          block_type: "work",
          title: "Work",
          start_time: data.workStart,
          end_time: data.workEnd,
          day_of_week: day,
          is_locked: false,
        });
      }

      // --- Reading time ---
      blocks.push({
        user_id: user.id,
        block_type: "reading",
        title: "Read",
        start_time: addMinutes(data.bedtime, -60),
        end_time: addMinutes(data.bedtime, -30),
        day_of_week: day,
        is_locked: true,
      });

      // --- Evening Routine ---
      blocks.push({
        user_id: user.id,
        block_type: "evening_routine",
        title: "Evening Routine",
        start_time: addMinutes(data.bedtime, -30),
        end_time: data.bedtime,
        day_of_week: day,
        is_locked: true,
      });

      // --- Sleep ---
      blocks.push({
        user_id: user.id,
        block_type: "sleep",
        title: "Sleep",
        start_time: data.bedtime,
        end_time: data.wakeTime,
        day_of_week: day,
        is_locked: true,
      });
    });

    // --- Strategy Block (only on the chosen strategy day) ---
    const strategyDay = data.strategyDay;
    const strategyDayBlocks = blocks.filter((b: any) => b.day_of_week === strategyDay && b.block_type !== "sleep");
    const morningRoutineOnStrategyDay = strategyDayBlocks.find((b: any) => b.block_type === "morning_routine");
    const morningRoutineEndTime = morningRoutineOnStrategyDay ? morningRoutineOnStrategyDay.end_time : addMinutes(data.wakeTime, 45);

    // Gap-finding algorithm
    const otherBlocks = strategyDayBlocks
      .filter((b: any) => b.block_type !== "morning_routine")
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    let strategyStart = morningRoutineEndTime;
    const strategyDurationMinutes = 45;

    for (const block of otherBlocks) {
      const candidateEnd = addMinutes(strategyStart, strategyDurationMinutes);
      if (candidateEnd <= block.start_time) {
        break; // found a gap
      }
      if (block.end_time > strategyStart) {
        strategyStart = block.end_time;
      }
    }

    blocks.push({
      user_id: user.id,
      block_type: "strategy",
      title: "Strategy Block",
      start_time: strategyStart,
      end_time: addMinutes(strategyStart, strategyDurationMinutes),
      day_of_week: strategyDay,
      is_locked: false,
    });

    await supabase.from("schedule_blocks").insert(blocks);

    // Create user_training_schedule entries
    if (trainingDaysData) {
      const scheduleEntries = Object.entries(trainingDayMap).map(
        ([dayOfWeek, trainingDayId]) => ({
          user_id: user.id,
          training_day_id: trainingDayId,
          day_of_week: parseInt(dayOfWeek, 10),
          week_number: 1,
          completed: false,
        })
      );

      if (scheduleEntries.length > 0) {
        await supabase.from("user_training_schedule").insert(scheduleEntries);
      }
    }
  };

  const seedDefaultChecklistItems = async () => {
    if (!user) return;

    const morningItems = DEFAULT_MORNING_ITEMS.map((title, idx) => ({
      user_id: user.id,
      routine_type: "morning_routine",
      title,
      sort_order: idx,
    }));

    const strategyItems = DEFAULT_STRATEGY_ITEMS.map((title, idx) => ({
      user_id: user.id,
      routine_type: "strategy",
      title,
      sort_order: idx,
    }));

    await supabase.from("routine_checklist_items").insert([...morningItems, ...strategyItems]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const stepTitles = [
    "Sleep & Recovery",
    "Work Type",
    "Work & Time",
    "Strategy Block",
    "Gym Commute",
    "Training Experience",
    "Select Program",
    "Your Goals",
    "Current State",
    "Body & Nutrition",
    "Review & Install",
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with progress */}
      <header className="px-6 py-6 border-b border-border/50">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {step} of {TOTAL_STEPS}
            </span>
            <span className="text-sm font-medium">{stepTitles[step - 1]}</span>
          </div>
          <ProgressBar value={step} max={TOTAL_STEPS} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="max-w-md mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {step === 1 && (
                <SleepStep
                  data={data}
                  updateData={updateData}
                  showWarning={showSleepWarning}
                  onDismissWarning={() => setShowSleepWarning(false)}
                />
              )}
              {step === 2 && <WorkTypeStep data={data} updateData={updateData} />}
              {step === 3 && <WorkStep data={data} updateData={updateData} />}
              {step === 4 && <StrategyStep data={data} updateData={updateData} />}
              {step === 5 && <GymCommuteStep data={data} updateData={updateData} />}
              {step === 6 && <TrainingStep data={data} updateData={updateData} />}
              {step === 7 && <ProgramStep data={data} updateData={updateData} />}
              {step === 8 && <GoalsStep data={data} updateData={updateData} />}
              {step === 9 && <FrictionStep data={data} updateData={updateData} />}
              {step === 10 && <NutritionStep data={data} updateData={updateData} />}
              {step === 11 && <ReviewStep data={data} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="px-6 py-6 border-t border-border/50 safe-bottom">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          {step > 1 ? (
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          ) : (
            <div />
          )}
          
          <Button
            variant="hero"
            onClick={handleNext}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              "Installing..."
            ) : step === TOTAL_STEPS ? (
              <>
                <Check className="h-4 w-4" />
                Install Structure
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
}

// Helper functions
function getDayName(day: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[day];
}

function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  
  const newHours = Math.floor(normalizedMinutes / 60);
  const newMins = normalizedMinutes % 60;
  
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
}

// Default morning routine checklist items
const DEFAULT_MORNING_ITEMS = [
  "Hydrate (500ml water)",
  "Make bed",
  "Cold shower / wash face",
  "10-min stretch or mobility",
  "Morning journal entry",
  "Review today's schedule",
];

// Default strategy block checklist items
const DEFAULT_STRATEGY_ITEMS = [
  "Review upcoming week's commitments",
  "Schedule all training sessions",
  "Plan meals and grocery shop",
  "Block social events and meetings",
  "Identify high-energy vs low-energy days",
  "Set top 3 priorities for the week",
];
