import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useToast } from "@/hooks/use-toast";
import { BuildingPlanScreen } from "@/components/onboarding/BuildingPlanScreen";

// Step components
import { SleepStep } from "@/components/onboarding/SleepStep";
import { WorkTypeStep } from "@/components/onboarding/WorkTypeStep";
import { WorkStep } from "@/components/onboarding/WorkStep";
import { FifoSiteStep } from "@/components/onboarding/FifoSiteStep";
import { GymCommuteStep } from "@/components/onboarding/GymCommuteStep";
import { TrainingStep } from "@/components/onboarding/TrainingStep";
import { ProgramStep } from "@/components/onboarding/ProgramStep";
import { GoalsStep } from "@/components/onboarding/GoalsStep";
import { EightWeekGoalsStep, type EightWeekGoal } from "@/components/onboarding/EightWeekGoalsStep";
import { FrictionStep } from "@/components/onboarding/FrictionStep";
import { ReviewStep } from "@/components/onboarding/ReviewStep";
import { NutritionStep } from "@/components/onboarding/NutritionStep";
import { StrategyStep } from "@/components/onboarding/StrategyStep";
import { HabitsStep } from "@/components/onboarding/HabitsStep";

export interface OnboardingData {
  // Sleep
  weekdayWakeTime: string;
  weekendWakeTime: string;
  sleepDuration: number;
  bedtime: string;
  weekendBedtime: string;
  
  // Work Type
  workType: "standard" | "shift_work" | "fifo";
  
  // Work
  workStart: string;
  workEnd: string;
  commuteMinutes: number;
  flexibleWork: boolean;
  preferredTrainingWindow: "morning" | "afternoon" | "evening";
  restDays: string[];
  preferredTrainingDays: string[];
  workDays: string[];
  
  // FIFO
  fifoShiftLength: number | null;
  fifoShiftType: string | null;
  
  // Commutes
  gymCommuteMinutes: number;
  workToGymMinutes: number;
  gymToWorkDirect: boolean;
  
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
  age?: number;
  gender: string | null;
  heightCm?: number;
  weightKg?: number;
  targetWeightKg?: number;
  activityLevel: string;
  dietaryChoices: string[];
  allergies: string;
  sensitivities: string;

  // Strategy
  strategyDay: number;

  // Habits
  habitsBuild: string[];
  habitsBreak: string[];
}

function getTotalSteps(workType: OnboardingData["workType"]): number {
  return workType === "fifo" ? 14 : 13;
}

function getStepTitles(workType: OnboardingData["workType"]): string[] {
  const common = [
    "Work Type",
    "Sleep & Recovery",
  ];
  const fifoExtra = ["FIFO Site Details"];
  const rest = [
    "Work & Availability",
    "Planning Ritual",
    "Your Commutes",
    "Training Experience",
    "Select Program",
    "Your Goals",
    "8-Week Goals",
    "Current State",
    "Body & Nutrition",
    "Habits",
    "Review & Install",
  ];
  return workType === "fifo" ? [...common, ...fifoExtra, ...rest] : [...common, ...rest];
}

const defaultData: OnboardingData = {
  weekdayWakeTime: "06:00",
  weekendWakeTime: "07:00",
  sleepDuration: 8,
  bedtime: "22:00",
  weekendBedtime: "23:00",
  workType: "standard",
  workStart: "09:00",
  workEnd: "17:00",
  commuteMinutes: 30,
  flexibleWork: false,
  preferredTrainingWindow: "morning",
  restDays: [],
  preferredTrainingDays: [],
  workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  fifoShiftLength: null,
  fifoShiftType: null,
  gymCommuteMinutes: 15,
  workToGymMinutes: 15,
  gymToWorkDirect: false,
  experienceTier: "beginner",
  selectedProgram: "3_day_strength",
  primaryGoals: [],
  secondaryGoals: [],
  frictionPoints: [],
  stressLevel: 5,
  readingHabit: 5,
  journalingOpenness: 5,
  nutritionConfidence: 5,
  gender: null,
  activityLevel: "moderate",
  dietaryChoices: [],
  allergies: "",
  sensitivities: "",
  strategyDay: 0,
  habitsBuild: ["Reading", "No screens before bed", "No coffee for 1 hour after waking", "No social media within 1 hour of waking"],
  habitsBreak: ["Porn", "Doom scrolling", "Vaping", "Screens before bed"],
};

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(defaultData);
  const [eightWeekGoals, setEightWeekGoals] = useState<EightWeekGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSleepWarning, setShowSleepWarning] = useState(false);
  const [showBuildingScreen, setShowBuildingScreen] = useState(false);
  const backendDoneRef = useRef(false);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkOnboarding = async () => {
      if (!user) return;
      
      const { data: onboardingData } = await supabase
        .from("onboarding_data")
        .select("onboarding_completed, onboarding_step")
        .eq("user_id", user.id)
        .single();
      
      if (onboardingData?.onboarding_completed) {
        // Reset so user can redo onboarding
        await supabase
          .from("onboarding_data")
          .update({ onboarding_completed: false, onboarding_step: 1 } as any)
          .eq("user_id", user.id);
        setStep(1);
      } else if (onboardingData?.onboarding_step) {
        setStep(onboardingData.onboarding_step);
      }
    };
    
    checkOnboarding();
  }, [user, navigate]);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  // Calculate weekday bedtime
  useEffect(() => {
    const [hours, minutes] = data.weekdayWakeTime.split(":").map(Number);
    const wakeMinutes = hours * 60 + minutes;
    const bedMinutes = wakeMinutes - data.sleepDuration * 60;
    const normalizedBedMinutes = bedMinutes < 0 ? bedMinutes + 24 * 60 : bedMinutes;
    
    const bedHours = Math.floor(normalizedBedMinutes / 60);
    const bedMins = normalizedBedMinutes % 60;
    const bedtime = `${bedHours.toString().padStart(2, "0")}:${bedMins.toString().padStart(2, "0")}`;
    
    setData((prev) => ({ ...prev, bedtime }));
  }, [data.weekdayWakeTime, data.sleepDuration]);

  // Calculate weekend bedtime
  useEffect(() => {
    const [hours, minutes] = data.weekendWakeTime.split(":").map(Number);
    const wakeMinutes = hours * 60 + minutes;
    const bedMinutes = wakeMinutes - data.sleepDuration * 60;
    const normalizedBedMinutes = bedMinutes < 0 ? bedMinutes + 24 * 60 : bedMinutes;
    
    const bedHours = Math.floor(normalizedBedMinutes / 60);
    const bedMins = normalizedBedMinutes % 60;
    const weekendBedtime = `${bedHours.toString().padStart(2, "0")}:${bedMins.toString().padStart(2, "0")}`;
    
    setData((prev) => ({ ...prev, weekendBedtime }));
  }, [data.weekendWakeTime, data.sleepDuration]);

  const handleNext = async () => {
    if (step === 2 && data.sleepDuration < 7) {
      setShowSleepWarning(true);
      return;
    }

    const totalSteps = getTotalSteps(data.workType);
    
    if (step < totalSteps) {
      const nextStep = step + 1;
      setStep(nextStep);
      
      if (user) {
        await supabase
          .from("onboarding_data")
          .update({ onboarding_step: nextStep })
          .eq("user_id", user.id);
      }
    } else {
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
      const { error } = await supabase
        .from("onboarding_data")
        .update({
          wake_time: data.weekdayWakeTime,
          weekend_wake_time: data.weekendWakeTime,
          sleep_duration: data.sleepDuration,
          bedtime: data.bedtime,
          weekend_bedtime: data.weekendBedtime,
          work_type: data.workType,
          work_start: data.workStart,
          work_end: data.workEnd,
          commute_minutes: data.commuteMinutes,
          flexible_work: data.flexibleWork,
          preferred_training_window: data.preferredTrainingWindow,
          rest_days: data.restDays,
          preferred_training_days: data.preferredTrainingDays,
          work_days: data.workDays,
          fifo_shift_length: data.fifoShiftLength,
          fifo_shift_type: data.fifoShiftType,
          gym_commute_minutes: data.gymCommuteMinutes,
          work_to_gym_minutes: data.workToGymMinutes,
          gym_to_work_direct: data.gymToWorkDirect,
          experience_tier: data.experienceTier,
          selected_program: data.selectedProgram,
          primary_goals: data.primaryGoals,
          secondary_goals: data.secondaryGoals,
          friction_points: data.frictionPoints,
          stress_level: data.stressLevel,
          reading_habit: data.readingHabit,
          journaling_openness: data.journalingOpenness,
          nutrition_confidence: data.nutritionConfidence,
          age: data.age,
          gender: data.gender,
          height_cm: data.heightCm,
          weight_kg: data.weightKg,
          target_weight_kg: data.targetWeightKg,
          activity_level: data.activityLevel,
          dietary_choices: data.dietaryChoices,
          allergies: data.allergies || null,
          sensitivities: data.sensitivities || null,
          strategy_day: data.strategyDay,
          onboarding_habits_build: data.habitsBuild,
          onboarding_habits_break: data.habitsBreak,
          onboarding_completed: true,
          onboarding_step: getTotalSteps(data.workType),
        } as any)
        .eq("user_id", user.id);

      if (error) throw error;

      // Show building screen immediately
      setShowBuildingScreen(true);
      setLoading(false);

      // Run backend work in parallel
      Promise.all([
        generateSchedule(),
        seedDefaultChecklistItems(),
        seedHabits(),
        saveEightWeekGoals(),
      ])
        .then(() => {
          backendDoneRef.current = true;
        })
        .catch(() => {
          backendDoneRef.current = true; // still allow navigation
        });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save your data. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleBuildingComplete = useCallback(() => {
    const checkAndNavigate = () => {
      if (backendDoneRef.current) {
        toast({
          title: "Structure installed",
          description: "Your operating system is ready.",
        });
        navigate("/dashboard");
      } else {
        setTimeout(checkAndNavigate, 500);
      }
    };
    checkAndNavigate();
  }, [navigate, toast]);

  const saveEightWeekGoals = async () => {
    if (!user || eightWeekGoals.length === 0) return;

    // Delete existing goals first to prevent duplicates on re-onboarding
    await supabase.from("user_eight_week_goals").delete().eq("user_id", user.id);

    const rows = eightWeekGoals.map((g) => ({
      user_id: user.id,
      goal_type: g.goal_type,
      goal_label: g.goal_label,
      target_value: g.target_value,
      baseline_value: g.goal_type === "weight_loss" ? (data.weightKg ?? 0) : 0,
      current_value: g.goal_type === "weight_loss" ? (data.weightKg ?? 0) : 0,
    }));

    await supabase.from("user_eight_week_goals").insert(rows);
  };

  const seedHabits = async () => {
    if (!user) return;

    // Delete existing habits first to prevent duplicates on re-onboarding
    await supabase.from("habits").delete().eq("user_id", user.id);

    const buildHabits = data.habitsBuild.map((title, idx) => ({
      user_id: user.id,
      title,
      habit_type: "build",
      sort_order: idx,
    }));

    const breakHabits = data.habitsBreak.map((title, idx) => ({
      user_id: user.id,
      title,
      habit_type: "break",
      sort_order: idx + buildHabits.length,
    }));

    if (buildHabits.length > 0 || breakHabits.length > 0) {
      await supabase.from("habits").insert([...buildHabits, ...breakHabits]);
    }
  };

  const generateSchedule = async () => {
    if (!user) return;

    // Clear existing schedule data to prevent duplicates on re-onboarding
    await supabase.from("schedule_block_overrides").delete().eq("user_id", user.id);
    await supabase.from("schedule_blocks").delete().eq("user_id", user.id);
    await supabase.from("user_training_schedule").delete().eq("user_id", user.id);
    await supabase.from("routine_checklist_completions").delete().eq("user_id", user.id);
    await supabase.from("routine_checklist_items").delete().eq("user_id", user.id);
    await supabase.from("workout_sessions").delete().eq("user_id", user.id);
    await supabase.from("habit_completions").delete().eq("user_id", user.id);
    await supabase.from("meal_completions").delete().eq("user_id", user.id);
    await supabase.from("workout_logs").delete().eq("user_id", user.id);
    await supabase.from("daily_weights").delete().eq("user_id", user.id);

    const { data: trainingDaysData } = await supabase
      .from("training_days")
      .select("*")
      .eq("program_key", data.selectedProgram)
      .order("day_number");

    // Use preferred training days if set, otherwise fall back to available non-rest days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const availableDays = data.preferredTrainingDays.length > 0
      ? allDays.filter((d) => data.preferredTrainingDays.includes(getDayName(d).toLowerCase()))
      : allDays.filter((d) => !data.restDays.includes(getDayName(d).toLowerCase()));

    const trainingDayMap: Record<number, string> = {};
    if (trainingDaysData) {
      trainingDaysData.forEach((td, idx) => {
        if (idx < availableDays.length) {
          trainingDayMap[availableDays[idx]] = td.id;
        }
      });
    }

    const homeToWork = data.commuteMinutes || 0;
    const homeToGym = data.gymCommuteMinutes || 0;
    const workToGym = data.workToGymMinutes || 0;
    const gymToWorkDirect = data.gymToWorkDirect;
    const trainingDuration = 60;
    const morningRoutineMinutes = 45;
    const hasWorkHours = !!(data.workStart && data.workEnd);

    const blocks: any[] = [];

    allDays.forEach((day) => {
      const isRestDay = data.restDays.includes(getDayName(day).toLowerCase());
      const hasTraining = !isRestDay && trainingDayMap[day];
      const td = hasTraining
        ? trainingDaysData?.find((t) => t.id === trainingDayMap[day])
        : null;
      const isWeekday = day >= 1 && day <= 5;
      const isWeekend = !isWeekday;
      const dayName = getDayName(day).toLowerCase();
      const hasWork = data.workDays.includes(dayName) && hasWorkHours;
      const wakeTime = isWeekend ? data.weekendWakeTime : data.weekdayWakeTime;
      const bedtime = isWeekend ? data.weekendBedtime : data.bedtime;

      const morningRoutineEnd = addMinutes(wakeTime, morningRoutineMinutes);

      blocks.push({
        user_id: user.id,
        block_type: "morning_routine",
        title: "Morning Routine",
        start_time: wakeTime,
        end_time: morningRoutineEnd,
        day_of_week: day,
        is_locked: true,
      });

      if (hasTraining && data.preferredTrainingWindow === "morning") {
        // Check if morning training fits before work
        let useMorning = true;
        if (hasWork) {
          // Calculate the total time needed: commute to gym + training + commute to work (or back home + commute to work)
          const commuteAfterTraining = gymToWorkDirect ? workToGym : (homeToGym + homeToWork);
          const totalNeeded = homeToGym + trainingDuration + commuteAfterTraining;
          const latestTrainingEnd = addMinutes(morningRoutineEnd, homeToGym + trainingDuration);
          // If training + commutes would end after work start, try working backwards from work start
          if (latestTrainingEnd > data.workStart) {
            // Work backwards from workStart
            const gymStartFromWork = gymToWorkDirect
              ? addMinutes(data.workStart, -(workToGym + trainingDuration))
              : addMinutes(data.workStart, -(homeToWork + homeToGym + trainingDuration));
            const departHome = addMinutes(gymStartFromWork, -homeToGym);
            if (departHome >= morningRoutineEnd) {
              // Fits before work — use adjusted times
              let cursor = departHome;
              if (homeToGym > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
                cursor = addMinutes(cursor, homeToGym);
              }
              blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
              cursor = addMinutes(cursor, trainingDuration);
              if (gymToWorkDirect) {
                if (workToGym > 0) {
                  blocks.push({ user_id: user.id, block_type: "commute", title: "Gym to Work", start_time: cursor, end_time: addMinutes(cursor, workToGym), day_of_week: day, is_locked: true });
                }
              } else {
                if (homeToGym > 0) {
                  blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
                }
                if (homeToWork > 0) {
                  blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
                }
              }
              blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });
              if (homeToWork > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
              }
              useMorning = false; // already handled
            } else {
              // No room before work — fall back to evening
              useMorning = false;
              // Add work blocks then evening training
              if (homeToWork > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
              }
              blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });
              let cursor = data.workEnd;
              if (workToGym > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym from Work", start_time: cursor, end_time: addMinutes(cursor, workToGym), day_of_week: day, is_locked: true });
                cursor = addMinutes(cursor, workToGym);
              }
              blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
              cursor = addMinutes(cursor, trainingDuration);
              if (homeToGym > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
              }
              if (homeToWork > 0) {
                blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
              }
            }
          }
        }

        if (useMorning) {
          // Original morning logic (no work conflict)
          let cursor = morningRoutineEnd;
          if (homeToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
            cursor = addMinutes(cursor, homeToGym);
          }
          blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
          cursor = addMinutes(cursor, trainingDuration);
          if (hasWork && gymToWorkDirect) {
            if (workToGym > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Gym to Work", start_time: cursor, end_time: addMinutes(cursor, workToGym), day_of_week: day, is_locked: true });
              cursor = addMinutes(cursor, workToGym);
            }
            const workStart = cursor > data.workStart ? cursor : data.workStart;
            blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });
            if (homeToWork > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
            }
          } else if (hasWork) {
            if (homeToGym > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
              cursor = addMinutes(cursor, homeToGym);
            }
            if (homeToWork > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
            }
            blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });
            if (homeToWork > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
            }
          } else {
            if (homeToGym > 0) {
              blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
            }
          }
        }
      } else if (hasTraining && data.preferredTrainingWindow === "evening") {
        if (hasWork) {
          if (homeToWork > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
          }
          blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });

          let cursor = data.workEnd;
          if (workToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym from Work", start_time: cursor, end_time: addMinutes(cursor, workToGym), day_of_week: day, is_locked: true });
            cursor = addMinutes(cursor, workToGym);
          }
          blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
          cursor = addMinutes(cursor, trainingDuration);
          if (homeToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
          }
        } else {
          let cursor = morningRoutineEnd;
          if (homeToGym > 0) {
            const eveningStart = "17:00";
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym", start_time: eveningStart, end_time: addMinutes(eveningStart, homeToGym), day_of_week: day, is_locked: true });
            cursor = addMinutes(eveningStart, homeToGym);
          } else {
            cursor = "17:00";
          }
          blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
          cursor = addMinutes(cursor, trainingDuration);
          if (homeToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
          }
        }
      } else if (hasTraining && data.preferredTrainingWindow === "afternoon") {
        if (hasWork) {
          if (homeToWork > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
          }
          blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });

          const trainingStart = "12:00";
          let cursor = trainingStart;
          if (workToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym from Work", start_time: addMinutes(trainingStart, -workToGym), end_time: trainingStart, day_of_week: day, is_locked: true });
          }
          blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
          cursor = addMinutes(cursor, trainingDuration);
          if (workToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Gym to Work", start_time: cursor, end_time: addMinutes(cursor, workToGym), day_of_week: day, is_locked: true });
          }
          if (homeToWork > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
          }
        } else {
          const trainingStart = "12:00";
          let cursor = trainingStart;
          if (homeToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Gym", start_time: addMinutes(trainingStart, -homeToGym), end_time: trainingStart, day_of_week: day, is_locked: true });
          }
          blocks.push({ user_id: user.id, block_type: "training", title: td ? td.name : "Training", start_time: cursor, end_time: addMinutes(cursor, trainingDuration), day_of_week: day, is_locked: true, training_day_id: trainingDayMap[day] });
          cursor = addMinutes(cursor, trainingDuration);
          if (homeToGym > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Gym", start_time: cursor, end_time: addMinutes(cursor, homeToGym), day_of_week: day, is_locked: true });
          }
        }
      } else {
        if (hasWork) {
          if (homeToWork > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive to Work", start_time: addMinutes(data.workStart, -homeToWork), end_time: data.workStart, day_of_week: day, is_locked: true });
          }
          blocks.push({ user_id: user.id, block_type: "work", title: "Work", start_time: data.workStart, end_time: data.workEnd, day_of_week: day, is_locked: false });
          if (homeToWork > 0) {
            blocks.push({ user_id: user.id, block_type: "commute", title: "Drive Home from Work", start_time: data.workEnd, end_time: addMinutes(data.workEnd, homeToWork), day_of_week: day, is_locked: true });
          }
        }
      }

      // Reading time
      blocks.push({
        user_id: user.id,
        block_type: "reading",
        title: "Read",
        start_time: addMinutes(bedtime, -60),
        end_time: addMinutes(bedtime, -30),
        day_of_week: day,
        is_locked: true,
      });

      // Evening Routine
      blocks.push({
        user_id: user.id,
        block_type: "evening_routine",
        title: "Evening Routine",
        start_time: addMinutes(bedtime, -30),
        end_time: bedtime,
        day_of_week: day,
        is_locked: true,
      });

      // Sleep — end_time uses the NEXT day's wake time (you wake up the next morning)
      const nextDay = (day + 1) % 7;
      const nextDayIsWeekday = nextDay >= 1 && nextDay <= 5;
      const nextDayWakeTime = nextDayIsWeekday ? data.weekdayWakeTime : data.weekendWakeTime;

      blocks.push({
        user_id: user.id,
        block_type: "sleep",
        title: "Sleep",
        start_time: bedtime,
        end_time: nextDayWakeTime,
        day_of_week: day,
        is_locked: true,
      });
    });

    // Strategy Block
    const strategyDay = data.strategyDay;
    const strategyDayBlocks = blocks.filter((b: any) => b.day_of_week === strategyDay && b.block_type !== "sleep");
    const morningRoutineOnStrategyDay = strategyDayBlocks.find((b: any) => b.block_type === "morning_routine");
    const strategyWakeTime = (strategyDay >= 1 && strategyDay <= 5) ? data.weekdayWakeTime : data.weekendWakeTime;
    const morningRoutineEndTime = morningRoutineOnStrategyDay ? morningRoutineOnStrategyDay.end_time : addMinutes(strategyWakeTime, 45);

    const otherBlocks = strategyDayBlocks
      .filter((b: any) => b.block_type !== "morning_routine")
      .sort((a: any, b: any) => a.start_time.localeCompare(b.start_time));

    let strategyStart = morningRoutineEndTime;
    const strategyDurationMinutes = 45;

    for (const block of otherBlocks) {
      const candidateEnd = addMinutes(strategyStart, strategyDurationMinutes);
      if (candidateEnd <= block.start_time) {
        break;
      }
      if (block.end_time > strategyStart) {
        strategyStart = block.end_time;
      }
    }

    blocks.push({
      user_id: user.id,
      block_type: "strategy",
      title: "Sunday Planning Ritual",
      start_time: strategyStart,
      end_time: addMinutes(strategyStart, strategyDurationMinutes),
      day_of_week: strategyDay,
      is_locked: false,
    });

    // Tag all home blocks with schedule_mode
    const homeBlocks = blocks.map((b: any) => ({ ...b, schedule_mode: 'home' }));
    await supabase.from("schedule_blocks").insert(homeBlocks);

    // Generate on-site schedule for FIFO users
    if (data.workType === 'fifo' && data.fifoShiftLength && data.fifoShiftType) {
      const onSiteBlocks = generateOnSiteBlocks(user.id, data, allDays);
      if (onSiteBlocks.length > 0) {
        await supabase.from("schedule_blocks").insert(onSiteBlocks);
      }
    }

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

  if (showBuildingScreen) {
    return <BuildingPlanScreen data={data} onComplete={handleBuildingComplete} />;
  }

  const totalSteps = getTotalSteps(data.workType);
  const stepTitles = getStepTitles(data.workType);

  // Map step number to the correct component based on work type
  const isFifo = data.workType === "fifo";
  const renderStep = () => {
    // Step 1 is always WorkType
    if (step === 1) return <WorkTypeStep data={data} updateData={updateData} />;
    // Step 2 is always Sleep
    if (step === 2) return (
      <SleepStep
        data={data}
        updateData={updateData}
        showWarning={showSleepWarning}
        onDismissWarning={() => setShowSleepWarning(false)}
      />
    );
    // For FIFO, step 3 is the site details step; for others, step 3 is Work & Availability
    // We use an offset: FIFO steps are shifted by 1 after step 3
    const offset = isFifo ? 1 : 0;
    if (isFifo && step === 3) return <FifoSiteStep data={data} updateData={updateData} />;
    
    const adjusted = step - offset;
    if (adjusted === 3) return <WorkStep data={data} updateData={updateData} />;
    if (adjusted === 4) return <StrategyStep data={data} updateData={updateData} />;
    if (adjusted === 5) return <GymCommuteStep data={data} updateData={updateData} />;
    if (adjusted === 6) return <TrainingStep data={data} updateData={updateData} />;
    if (adjusted === 7) return <ProgramStep data={data} updateData={updateData} />;
    if (adjusted === 8) return <GoalsStep data={data} updateData={updateData} />;
    if (adjusted === 9) return <EightWeekGoalsStep goals={eightWeekGoals} onGoalsChange={setEightWeekGoals} data={data} />;
    if (adjusted === 10) return <FrictionStep data={data} updateData={updateData} />;
    if (adjusted === 11) return <NutritionStep data={data} updateData={updateData} />;
    if (adjusted === 12) return <HabitsStep data={data} updateData={updateData} />;
    if (adjusted === 13) return <ReviewStep data={data} eightWeekGoals={eightWeekGoals} />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-6 border-b border-border/50">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium">{stepTitles[step - 1]}</span>
          </div>
          <ProgressBar value={step} max={totalSteps} />
        </div>
      </header>

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
              {renderStep()}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

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
            ) : step === totalSteps ? (
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

function generateOnSiteBlocks(userId: string, data: OnboardingData, allDays: number[]): any[] {
  const blocks: any[] = [];
  const shiftLength = data.fifoShiftLength || 12;
  const shiftType = data.fifoShiftType || 'days';
  const shortRoutine = 20;
  const trainingDuration = 45; // compressed on-site session

  allDays.forEach((day) => {
    const isDayShift = shiftType === 'days' || (shiftType === 'both' && day % 2 === 0);

    if (isDayShift) {
      // Day shift: wake 05:00, shift 06:00-18:00 (or 16:00 for 10h)
      const wakeTime = '05:00';
      const shiftStart = '06:00';
      const shiftEnd = shiftLength === 12 ? '18:00' : '16:00';
      const bedtime = '21:00';

      blocks.push({ user_id: userId, block_type: 'morning_routine', title: 'Morning Routine', start_time: wakeTime, end_time: addMinutes(wakeTime, shortRoutine), day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
      blocks.push({ user_id: userId, block_type: 'work', title: 'Site Shift', start_time: shiftStart, end_time: shiftEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });

      // Training after shift if time allows
      const trainingStart = addMinutes(shiftEnd, 30);
      const trainingEnd = addMinutes(trainingStart, trainingDuration);
      if (trainingEnd <= '20:30') {
        blocks.push({ user_id: userId, block_type: 'training', title: 'On-Site Training', start_time: trainingStart, end_time: trainingEnd, day_of_week: day, is_locked: false, schedule_mode: 'on_site' });
      }

      blocks.push({ user_id: userId, block_type: 'evening_routine', title: 'Evening Routine', start_time: addMinutes(bedtime, -shortRoutine), end_time: bedtime, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });

      const nextDay = (day + 1) % 7;
      blocks.push({ user_id: userId, block_type: 'sleep', title: 'Sleep', start_time: bedtime, end_time: '05:00', day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
    } else {
      // Night shift: wake 16:00, shift 18:00-06:00 (or 04:00 for 10h), sleep 07:00-15:00
      const wakeTime = '16:00';
      const shiftStart = '18:00';
      const shiftEnd = shiftLength === 12 ? '06:00' : '04:00';
      const sleepStart = '07:00';
      const sleepEnd = '15:00';

      blocks.push({ user_id: userId, block_type: 'sleep', title: 'Sleep', start_time: sleepStart, end_time: sleepEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
      blocks.push({ user_id: userId, block_type: 'morning_routine', title: 'Afternoon Routine', start_time: wakeTime, end_time: addMinutes(wakeTime, shortRoutine), day_of_week: day, is_locked: true, schedule_mode: 'on_site' });

      // Training before shift
      const trainingStart = addMinutes(wakeTime, shortRoutine + 15);
      const trainingEnd = addMinutes(trainingStart, trainingDuration);
      if (trainingEnd <= '17:30') {
        blocks.push({ user_id: userId, block_type: 'training', title: 'On-Site Training', start_time: trainingStart, end_time: trainingEnd, day_of_week: day, is_locked: false, schedule_mode: 'on_site' });
      }

      blocks.push({ user_id: userId, block_type: 'work', title: 'Night Shift', start_time: shiftStart, end_time: shiftEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
    }
  });

  return blocks;
}

const DEFAULT_MORNING_ITEMS = [
  "Hydrate (500ml water)",
  "Make bed",
  "Cold shower / wash face",
  "10-min stretch or mobility",
  "Morning journal entry",
  "Review today's schedule",
];

const DEFAULT_STRATEGY_ITEMS = [
  "Review upcoming week's commitments",
  "Schedule all training sessions",
  "Plan meals and grocery shop",
  "Block social events and meetings",
  "Identify high-energy vs low-energy days",
  "Set top 3 priorities for the week",
];
