import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Flame,
  Clock,
  ChevronUp,
  ChevronDown,
  TrendingUp,
  Lock,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { WarmUpBlock } from "@/components/workout/WarmUpBlock";
import { MobilityBlock } from "@/components/workout/MobilityBlock";
import { ExerciseFormCues } from "@/components/workout/ExerciseFormCues";
import { PBIndicator } from "@/components/workout/PBIndicator";
import { WorkoutSummaryModal, SummaryData } from "@/components/workout/WorkoutSummaryModal";

interface TrainingDay {
  id: string;
  program_key: string;
  day_number: number;
  name: string;
  focus: string;
  warmup_items: { section: string; items: string[] }[];
  mobility_items: { label: string }[];
}

interface Exercise {
  id: string;
  training_day_id: string;
  exercise_order: number;
  name: string;
  sets_amateur: number;
  sets_beginner: number;
  sets_intermediate: number;
  sets_advanced: number;
  reps: string;
  rest_seconds: number | null;
  notes: string | null;
  form_cues: string[];
}

interface WorkoutLog {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps_completed: number | null;
  duration_seconds?: number | null;
  week_number: number;
}

interface SetInput {
  weight: string;
  reps: string;
  duration: string;
  saved: boolean;
}

type PBType = "weight" | "reps" | "volume";

// --- Prescription type helpers ---

const getPrescriptionType = (reps: string): "duration" | "reps" => {
  const lower = reps.toLowerCase();
  if (lower.includes("sec") || lower.includes("min")) return "duration";
  return "reps";
};

const parsePrescribedSeconds = (reps: string): number | null => {
  const lower = reps.toLowerCase();
  // Match patterns like "30 sec", "45-60 sec", "2 min", "1-2 min"
  const secMatch = lower.match(/(\d+)[\s-]*sec/);
  const rangeSecMatch = lower.match(/(\d+)\s*-\s*(\d+)\s*sec/);
  const minMatch = lower.match(/(\d+)[\s-]*min/);
  const rangeMinMatch = lower.match(/(\d+)\s*-\s*(\d+)\s*min/);

  if (rangeSecMatch) return parseInt(rangeSecMatch[2], 10);
  if (secMatch) return parseInt(secMatch[1], 10);
  if (rangeMinMatch) return parseInt(rangeMinMatch[2], 10) * 60;
  if (minMatch) return parseInt(minMatch[1], 10) * 60;
  return null;
};

export default function WorkoutPage() {
  const { trainingDayId } = useParams<{ trainingDayId: string }>();
  const [searchParams] = useSearchParams();
  const weekNumber = parseInt(searchParams.get("week") || "1", 10);

  const [trainingDay, setTrainingDay] = useState<TrainingDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [experienceTier, setExperienceTier] = useState("beginner");
  const [previousLogs, setPreviousLogs] = useState<WorkoutLog[]>([]);
  const [currentLogs, setCurrentLogs] = useState<WorkoutLog[]>([]);
  const [allTimeLogs, setAllTimeLogs] = useState<WorkoutLog[]>([]);
  const [setInputs, setSetInputs] = useState<Record<string, SetInput[]>>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [warmupComplete, setWarmupComplete] = useState(false);
  const [pbFlags, setPbFlags] = useState<Record<string, PBType[]>>({});
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData>({
    improvements: [],
    totalVolume: 0,
    prevVolume: null,
    weeklyCompleted: 0,
    weeklyTotal: 0,
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !trainingDayId) return;

      const [dayRes, exercisesRes, onboardingRes, currentLogsRes, prevLogsRes, scheduleRes] =
        await Promise.all([
          supabase.from("training_days").select("*").eq("id", trainingDayId).maybeSingle(),
          supabase
            .from("training_exercises")
            .select("*")
            .eq("training_day_id", trainingDayId)
            .order("exercise_order"),
          supabase
            .from("onboarding_data")
            .select("experience_tier")
            .eq("user_id", user.id)
            .maybeSingle(),
          supabase
            .from("workout_logs")
            .select("*")
            .eq("user_id", user.id)
            .eq("training_day_id", trainingDayId)
            .eq("week_number", weekNumber),
          weekNumber > 1
            ? supabase
                .from("workout_logs")
                .select("*")
                .eq("user_id", user.id)
                .eq("training_day_id", trainingDayId)
                .eq("week_number", weekNumber - 1)
            : Promise.resolve({ data: [] as WorkoutLog[] }),
          supabase
            .from("user_training_schedule")
            .select("completed")
            .eq("user_id", user.id)
            .eq("training_day_id", trainingDayId)
            .eq("week_number", weekNumber)
            .maybeSingle(),
        ]);

      if (dayRes.data) {
        const day = dayRes.data as any;
        setTrainingDay({
          ...day,
          warmup_items: Array.isArray(day.warmup_items) ? day.warmup_items : [],
          mobility_items: Array.isArray(day.mobility_items) ? day.mobility_items : [],
        });
        const items = Array.isArray(day.warmup_items) ? day.warmup_items : [];
        if (items.length === 0 || items.flatMap((s: any) => s.items || []).length === 0) {
          setWarmupComplete(true);
        }
      }

      const exerciseData = (exercisesRes.data || []) as any[];
      const mappedExercises: Exercise[] = exerciseData.map((ex) => ({
        ...ex,
        form_cues: Array.isArray(ex.form_cues) ? ex.form_cues : [],
      }));
      setExercises(mappedExercises);

      if (onboardingRes.data) setExperienceTier(onboardingRes.data.experience_tier || "beginner");
      if (currentLogsRes.data) setCurrentLogs(currentLogsRes.data);
      if (prevLogsRes.data) setPreviousLogs(prevLogsRes.data);
      if (scheduleRes.data?.completed) setWorkoutCompleted(true);

      // Fetch all-time logs for PB detection
      if (mappedExercises.length > 0) {
        const exerciseIds = mappedExercises.map((ex) => ex.id);
        const { data: allLogs } = await supabase
          .from("workout_logs")
          .select("*")
          .eq("user_id", user.id)
          .in("exercise_id", exerciseIds);
        if (allLogs) setAllTimeLogs(allLogs);
      }

      // Initialize set inputs
      if (exerciseData.length > 0) {
        const tier = onboardingRes.data?.experience_tier || "beginner";
        const inputs: Record<string, SetInput[]> = {};

        mappedExercises.forEach((ex) => {
          const setCount = getSetCountForTier(ex, tier);
          const existingLogs = (currentLogsRes.data || []).filter(
            (l: WorkoutLog) => l.exercise_id === ex.id
          );
          const isDuration = getPrescriptionType(ex.reps) === "duration";

          inputs[ex.id] = Array.from({ length: setCount }, (_, i) => {
            const log = existingLogs.find((l: WorkoutLog) => l.set_number === i + 1);
            return {
              weight: log?.weight_kg?.toString() || "",
              reps: log?.reps_completed?.toString() || "",
              duration: isDuration ? (log?.duration_seconds?.toString() || "") : "",
              saved: !!log,
            };
          });
        });

        setSetInputs(inputs);
        if (mappedExercises.length > 0) {
          setExpandedExercise(mappedExercises[0].id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, trainingDayId, weekNumber]);

  const getSetCountForTier = (exercise: Exercise, tier: string): number => {
    switch (tier) {
      case "absolute_amateur": return exercise.sets_amateur;
      case "beginner": return exercise.sets_beginner;
      case "intermediate": return exercise.sets_intermediate;
      case "advanced": return exercise.sets_advanced;
      default: return exercise.sets_beginner;
    }
  };

  const getSetCount = (exercise: Exercise): number => {
    return getSetCountForTier(exercise, experienceTier);
  };

  const getPreviousLog = (exerciseId: string, setNumber: number): WorkoutLog | undefined => {
    return previousLogs.find(
      (l) => l.exercise_id === exerciseId && l.set_number === setNumber
    );
  };

  const detectPBs = (exerciseId: string, weight: number, reps: number) => {
    const historicalForExercise = allTimeLogs.filter(
      (l) => l.exercise_id === exerciseId
    );
    const pbs: PBType[] = [];

    const maxWeight = Math.max(0, ...historicalForExercise.map((l) => l.weight_kg || 0));
    if (weight > maxWeight) pbs.push("weight");

    const sameWeightLogs = historicalForExercise.filter((l) => l.weight_kg === weight);
    const maxRepsAtWeight = Math.max(0, ...sameWeightLogs.map((l) => l.reps_completed || 0));
    if (reps > maxRepsAtWeight && !pbs.includes("weight")) pbs.push("reps");

    return pbs;
  };

  const updateSetInput = (exerciseId: string, setIndex: number, field: "weight" | "reps" | "duration", value: string) => {
    setSetInputs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      sets[setIndex] = { ...sets[setIndex], [field]: value };
      updated[exerciseId] = sets;
      return updated;
    });
  };

  const saveSet = async (exerciseId: string, setIndex: number) => {
    if (!user || !trainingDayId) return;

    const input = setInputs[exerciseId]?.[setIndex];
    if (!input) return;

    // Find the exercise to check prescription type
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    const isDuration = exercise ? getPrescriptionType(exercise.reps) === "duration" : false;

    const weightKg = isDuration ? null : (input.weight ? parseFloat(input.weight) : null);
    const repsCompleted = isDuration ? null : (input.reps ? parseInt(input.reps, 10) : null);
    const durationSeconds = isDuration ? (input.duration ? parseInt(input.duration, 10) : null) : null;

    const existingLog = currentLogs.find(
      (l) => l.exercise_id === exerciseId && l.set_number === setIndex + 1
    );

    if (existingLog) {
      await supabase
        .from("workout_logs")
        .update({ 
          weight_kg: weightKg, 
          reps_completed: repsCompleted,
          duration_seconds: durationSeconds,
        } as any)
        .eq("id", existingLog.id);
    } else {
      const { data } = await supabase
        .from("workout_logs")
        .insert({
          user_id: user.id,
          training_day_id: trainingDayId,
          exercise_id: exerciseId,
          week_number: weekNumber,
          set_number: setIndex + 1,
          weight_kg: weightKg,
          reps_completed: repsCompleted,
          duration_seconds: durationSeconds,
        } as any)
        .select()
        .single();

      if (data) {
        setCurrentLogs((prev) => [...prev, data as any]);
      }
    }

    // Detect PBs only for reps-based exercises
    if (!isDuration && weightKg && repsCompleted) {
      const pbs = detectPBs(exerciseId, weightKg, repsCompleted);
      if (pbs.length > 0) {
        const key = `${exerciseId}-${setIndex}`;
        setPbFlags((prev) => ({ ...prev, [key]: pbs }));
      }
    }

    // Mark as saved
    setSetInputs((prev) => {
      const updated = { ...prev };
      const sets = [...(updated[exerciseId] || [])];
      sets[setIndex] = { ...sets[setIndex], saved: true };
      updated[exerciseId] = sets;
      return updated;
    });
  };

  const computeSummaryData = async () => {
    if (!user) return;

    let totalVolume = 0;
    const improvements: SummaryData["improvements"] = [];

    for (const exercise of exercises) {
      const isDuration = getPrescriptionType(exercise.reps) === "duration";
      const sets = setInputs[exercise.id] || [];
      
      // Duration exercises contribute 0 volume
      if (isDuration) continue;

      let exerciseVolume = 0;
      sets.forEach((s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        exerciseVolume += w * r;
      });
      totalVolume += exerciseVolume;

      const prevSets = previousLogs.filter((l) => l.exercise_id === exercise.id);
      const prevVolume = prevSets.reduce(
        (sum, l) => sum + (l.weight_kg || 0) * (l.reps_completed || 0),
        0
      );

      if (exerciseVolume > prevVolume && prevVolume > 0) {
        const delta = exerciseVolume - prevVolume;
        improvements.push({
          name: exercise.name,
          type: "volume",
          detail: `+${delta.toLocaleString()} kg volume`,
        });
      } else {
        const currentMaxWeight = Math.max(0, ...sets.map((s) => parseFloat(s.weight) || 0));
        const prevMaxWeight = Math.max(0, ...prevSets.map((l) => l.weight_kg || 0));
        if (currentMaxWeight > prevMaxWeight && prevMaxWeight > 0) {
          improvements.push({
            name: exercise.name,
            type: "weight",
            detail: `${prevMaxWeight} → ${currentMaxWeight} kg`,
          });
        }
      }
    }

    const prevTotalVolume = previousLogs.reduce(
      (sum, l) => sum + (l.weight_kg || 0) * (l.reps_completed || 0),
      0
    );

    const { data: weekSchedule } = await supabase
      .from("user_training_schedule")
      .select("completed")
      .eq("user_id", user.id)
      .eq("week_number", weekNumber);

    const weeklyTotal = weekSchedule?.length || 0;
    const weeklyCompleted = weekSchedule?.filter((s) => s.completed).length || 0;

    setSummaryData({
      improvements,
      totalVolume,
      prevVolume: previousLogs.length > 0 ? prevTotalVolume : null,
      weeklyCompleted,
      weeklyTotal: Math.max(weeklyTotal, 1),
    });
  };

  const completeWorkout = async () => {
    if (!user || !trainingDayId) return;
    setSaving(true);

    try {
      // Save all unsaved sets
      for (const [exerciseId, sets] of Object.entries(setInputs)) {
        const exercise = exercises.find((ex) => ex.id === exerciseId);
        const isDuration = exercise ? getPrescriptionType(exercise.reps) === "duration" : false;
        
        for (let i = 0; i < sets.length; i++) {
          if (!sets[i].saved) {
            if (isDuration && sets[i].duration) {
              await saveSet(exerciseId, i);
            } else if (!isDuration && (sets[i].weight || sets[i].reps)) {
              await saveSet(exerciseId, i);
            }
          }
        }
      }

      // Mark workout as completed
      const { data: existing } = await supabase
        .from("user_training_schedule")
        .select("id")
        .eq("user_id", user.id)
        .eq("training_day_id", trainingDayId)
        .eq("week_number", weekNumber)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("user_training_schedule")
          .update({ completed: true, completed_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        const { data: block } = await supabase
          .from("schedule_blocks")
          .select("day_of_week")
          .eq("user_id", user.id)
          .eq("training_day_id", trainingDayId)
          .maybeSingle();

        await supabase.from("user_training_schedule").insert({
          user_id: user.id,
          training_day_id: trainingDayId,
          day_of_week: block?.day_of_week ?? new Date().getDay(),
          week_number: weekNumber,
          completed: true,
          completed_at: new Date().toISOString(),
        });
      }

      setWorkoutCompleted(true);

      await computeSummaryData();
      setShowSummary(true);

      toast({
        title: "Workout complete 💪",
        description: "Your progress has been saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save workout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const allSetsLogged = Object.entries(setInputs).every(([exerciseId, sets]) => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    const isDuration = exercise ? getPrescriptionType(exercise.reps) === "duration" : false;
    return sets.every((s) => isDuration ? !!s.duration : (!!s.weight && !!s.reps));
  });

  const isLocked = !warmupComplete && !workoutCompleted;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!trainingDay) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Workout not found.</div>
      </div>
    );
  }

  return (
    <MobileLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-primary mb-2 hover:underline flex items-center gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
          <h1 className="text-xl font-semibold">{trainingDay.name}</h1>
          <p className="text-sm text-muted-foreground">
            {trainingDay.focus} • Week {weekNumber}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-3">
            {/* Warm-Up Block */}
            <WarmUpBlock
              warmupItems={trainingDay.warmup_items}
              onCompleteChange={setWarmupComplete}
            />

            {/* Lock overlay message */}
            {isLocked && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Complete warm-up to unlock working sets
                </span>
              </div>
            )}

            {/* Exercise List */}
            {exercises.map((exercise, index) => {
              const setCount = getSetCount(exercise);
              const sets = setInputs[exercise.id] || [];
              const isExpanded = expandedExercise === exercise.id;
              const completedSets = sets.filter((s) => s.saved).length;
              const isDuration = getPrescriptionType(exercise.reps) === "duration";
              const prescribedSeconds = isDuration ? parsePrescribedSeconds(exercise.reps) : null;

              return (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "rounded-lg bg-muted/30 border border-border/50 overflow-hidden",
                    isLocked && "opacity-60"
                  )}
                >
                  {/* Exercise Header */}
                  <button
                    onClick={() =>
                      setExpandedExercise(isExpanded ? null : exercise.id)
                    }
                    className="w-full text-left p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold",
                          completedSets === setCount
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {completedSets === setCount ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium text-sm">{exercise.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {setCount} sets × {exercise.reps}
                          {exercise.rest_seconds && (
                            <span className="ml-2">
                              <Clock className="h-3 w-3 inline" /> {exercise.rest_seconds}s
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded: Set Logging */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="px-4 pb-4 space-y-3"
                    >
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground/70 italic">
                          💡 {exercise.notes}
                        </p>
                      )}

                      {/* Form Cues */}
                      <ExerciseFormCues cues={exercise.form_cues} />

                      {/* Set Header - conditional columns */}
                      {isDuration ? (
                        <div className="grid grid-cols-[40px_1fr_60px] gap-2 text-xs text-muted-foreground font-medium">
                          <span>Set</span>
                          <span>Time (sec)</span>
                          <span className="text-center">Prev</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-[40px_1fr_1fr_60px] gap-2 text-xs text-muted-foreground font-medium">
                          <span>Set</span>
                          <span>Weight (kg)</span>
                          <span>Reps</span>
                          <span className="text-center">Prev</span>
                        </div>
                      )}

                      {/* Set Rows */}
                      {sets.map((setInput, setIdx) => {
                        const prevLog = getPreviousLog(exercise.id, setIdx + 1);
                        const pbKey = `${exercise.id}-${setIdx}`;
                        const pbs = pbFlags[pbKey] || [];

                        return (
                          <div key={setIdx} className="space-y-1">
                            {isDuration ? (
                              /* Duration-based row */
                              <div
                                className={cn(
                                  "grid grid-cols-[40px_1fr_60px] gap-2 items-center",
                                  setInput.saved && "opacity-70"
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-sm font-medium text-center",
                                    setInput.saved ? "text-primary" : "text-muted-foreground"
                                  )}
                                >
                                  {setInput.saved ? (
                                    <Check className="h-4 w-4 mx-auto" />
                                  ) : (
                                    setIdx + 1
                                  )}
                                </span>
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder={prescribedSeconds?.toString() || "0"}
                                  value={setInput.duration}
                                  onChange={(e) =>
                                    updateSetInput(exercise.id, setIdx, "duration", e.target.value)
                                  }
                                  onBlur={() => {
                                    if (setInput.duration) {
                                      saveSet(exercise.id, setIdx);
                                    }
                                  }}
                                  className="h-9 text-sm"
                                  disabled={isLocked || workoutCompleted}
                                />
                                <div className="text-center">
                                  {prevLog?.duration_seconds ? (
                                    <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                      <Clock className="h-3 w-3" />
                                      {prevLog.duration_seconds}s
                                    </span>
                                  ) : prevLog ? (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Reps-based row (unchanged) */
                              <div
                                className={cn(
                                  "grid grid-cols-[40px_1fr_1fr_60px] gap-2 items-center",
                                  setInput.saved && "opacity-70"
                                )}
                              >
                                <span
                                  className={cn(
                                    "text-sm font-medium text-center",
                                    setInput.saved
                                      ? "text-primary"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {setInput.saved ? (
                                    <Check className="h-4 w-4 mx-auto" />
                                  ) : (
                                    setIdx + 1
                                  )}
                                </span>
                                <Input
                                  type="number"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={setInput.weight}
                                  onChange={(e) =>
                                    updateSetInput(exercise.id, setIdx, "weight", e.target.value)
                                  }
                                  onBlur={() => {
                                    if (setInput.weight && setInput.reps) {
                                      saveSet(exercise.id, setIdx);
                                    }
                                  }}
                                  className="h-9 text-sm"
                                  disabled={isLocked || workoutCompleted}
                                />
                                <Input
                                  type="number"
                                  inputMode="numeric"
                                  placeholder="0"
                                  value={setInput.reps}
                                  onChange={(e) =>
                                    updateSetInput(exercise.id, setIdx, "reps", e.target.value)
                                  }
                                  onBlur={() => {
                                    if (setInput.weight && setInput.reps) {
                                      saveSet(exercise.id, setIdx);
                                    }
                                  }}
                                  className="h-9 text-sm"
                                  disabled={isLocked || workoutCompleted}
                                />
                                <div className="text-center">
                                  {prevLog ? (
                                    <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                      <TrendingUp className="h-3 w-3" />
                                      {prevLog.weight_kg}×{prevLog.reps_completed}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </div>
                            )}
                            {/* PB Indicators - only for reps-based */}
                            {!isDuration && pbs.length > 0 && (
                              <div className="flex gap-1 pl-10">
                                {pbs.map((pb) => (
                                  <PBIndicator key={pb} type={pb} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {/* Mobility Block */}
            <MobilityBlock mobilityItems={trainingDay.mobility_items} />
          </div>
        </div>

        {/* Complete Workout Footer */}
        <div className="px-6 py-4 border-t border-border/50 safe-bottom shrink-0">
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={completeWorkout}
            disabled={workoutCompleted || saving || isLocked}
          >
            {workoutCompleted ? (
              <>
                <Check className="h-4 w-4" />
                Workout Complete
              </>
            ) : saving ? (
              "Saving..."
            ) : isLocked ? (
              <>
                <Lock className="h-4 w-4" />
                Complete Warm-Up First
              </>
            ) : (
              <>
                <Flame className="h-4 w-4" />
                {allSetsLogged ? "Complete Workout" : "Complete & Save"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Modal */}
      <WorkoutSummaryModal
        open={showSummary}
        onOpenChange={setShowSummary}
        data={summaryData}
      />
    </MobileLayout>
  );
}
