import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Flame,
  Clock,
  Target,
  ChevronUp,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TrainingDay {
  id: string;
  program_key: string;
  day_number: number;
  name: string;
  focus: string;
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
}

interface WorkoutLog {
  id: string;
  exercise_id: string;
  set_number: number;
  weight_kg: number | null;
  reps_completed: number | null;
  week_number: number;
}

interface SetInput {
  weight: string;
  reps: string;
  saved: boolean;
}

export default function WorkoutPage() {
  const { trainingDayId } = useParams<{ trainingDayId: string }>();
  const [searchParams] = useSearchParams();
  const weekNumber = parseInt(searchParams.get("week") || "1", 10);

  const [trainingDay, setTrainingDay] = useState<TrainingDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [experienceTier, setExperienceTier] = useState("beginner");
  const [previousLogs, setPreviousLogs] = useState<WorkoutLog[]>([]);
  const [currentLogs, setCurrentLogs] = useState<WorkoutLog[]>([]);
  const [setInputs, setSetInputs] = useState<Record<string, SetInput[]>>({});
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

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

      // Fetch training day, exercises, user data, and logs in parallel
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

      if (dayRes.data) setTrainingDay(dayRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      if (onboardingRes.data) setExperienceTier(onboardingRes.data.experience_tier || "beginner");
      if (currentLogsRes.data) setCurrentLogs(currentLogsRes.data);
      if (prevLogsRes.data) setPreviousLogs(prevLogsRes.data);
      if (scheduleRes.data?.completed) setWorkoutCompleted(true);

      // Initialize set inputs from current logs or empty
      if (exercisesRes.data) {
        const tier = onboardingRes.data?.experience_tier || "beginner";
        const inputs: Record<string, SetInput[]> = {};

        exercisesRes.data.forEach((ex) => {
          const setCount = getSetCountForTier(ex, tier);
          const existingLogs = (currentLogsRes.data || []).filter(
            (l) => l.exercise_id === ex.id
          );

          inputs[ex.id] = Array.from({ length: setCount }, (_, i) => {
            const log = existingLogs.find((l) => l.set_number === i + 1);
            return {
              weight: log?.weight_kg?.toString() || "",
              reps: log?.reps_completed?.toString() || "",
              saved: !!log,
            };
          });
        });

        setSetInputs(inputs);
        // Auto-expand first exercise
        if (exercisesRes.data.length > 0) {
          setExpandedExercise(exercisesRes.data[0].id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, trainingDayId, weekNumber]);

  const getSetCountForTier = (exercise: Exercise, tier: string): number => {
    switch (tier) {
      case "absolute_amateur":
        return exercise.sets_amateur;
      case "beginner":
        return exercise.sets_beginner;
      case "intermediate":
        return exercise.sets_intermediate;
      case "advanced":
        return exercise.sets_advanced;
      default:
        return exercise.sets_beginner;
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

  const updateSetInput = (exerciseId: string, setIndex: number, field: "weight" | "reps", value: string) => {
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

    const weightKg = input.weight ? parseFloat(input.weight) : null;
    const repsCompleted = input.reps ? parseInt(input.reps, 10) : null;

    // Check if log already exists
    const existingLog = currentLogs.find(
      (l) => l.exercise_id === exerciseId && l.set_number === setIndex + 1
    );

    if (existingLog) {
      await supabase
        .from("workout_logs")
        .update({ weight_kg: weightKg, reps_completed: repsCompleted })
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
        })
        .select()
        .single();

      if (data) {
        setCurrentLogs((prev) => [...prev, data]);
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

  const completeWorkout = async () => {
    if (!user || !trainingDayId) return;
    setSaving(true);

    try {
      // Save all unsaved sets
      for (const [exerciseId, sets] of Object.entries(setInputs)) {
        for (let i = 0; i < sets.length; i++) {
          if (!sets[i].saved && (sets[i].weight || sets[i].reps)) {
            await saveSet(exerciseId, i);
          }
        }
      }

      // Mark workout as completed in user_training_schedule
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
        // Get day_of_week from schedule_blocks
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

  const allSetsLogged = Object.entries(setInputs).every(([, sets]) =>
    sets.every((s) => s.weight && s.reps)
  );

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

        {/* Exercise List */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-3">
            {exercises.map((exercise, index) => {
              const setCount = getSetCount(exercise);
              const sets = setInputs[exercise.id] || [];
              const isExpanded = expandedExercise === exercise.id;
              const completedSets = sets.filter((s) => s.saved).length;

              return (
                <motion.div
                  key={exercise.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-lg bg-muted/30 border border-border/50 overflow-hidden"
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

                      {/* Set Header */}
                      <div className="grid grid-cols-[40px_1fr_1fr_60px] gap-2 text-xs text-muted-foreground font-medium">
                        <span>Set</span>
                        <span>Weight (kg)</span>
                        <span>Reps</span>
                        <span className="text-center">Prev</span>
                      </div>

                      {/* Set Rows */}
                      {sets.map((setInput, setIdx) => {
                        const prevLog = getPreviousLog(exercise.id, setIdx + 1);

                        return (
                          <div
                            key={setIdx}
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
                              disabled={workoutCompleted}
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
                              disabled={workoutCompleted}
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
                        );
                      })}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Complete Workout Footer */}
        <div className="px-6 py-4 border-t border-border/50 safe-bottom shrink-0">
          <Button
            variant="hero"
            className="w-full gap-2"
            onClick={completeWorkout}
            disabled={workoutCompleted || saving}
          >
            {workoutCompleted ? (
              <>
                <Check className="h-4 w-4" />
                Workout Complete
              </>
            ) : saving ? (
              "Saving..."
            ) : (
              <>
                <Flame className="h-4 w-4" />
                {allSetsLogged ? "Complete Workout" : "Complete & Save"}
              </>
            )}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
