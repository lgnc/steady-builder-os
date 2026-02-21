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
import { getWeekStartDate } from "@/lib/weekUtils";
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

interface WorkoutSet {
  id: string;
  session_id: string;
  training_exercise_id: string;
  set_index: number;
  weight_kg: number | null;
  reps: number | null;
  duration_seconds: number | null;
  notes: string | null;
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

  const dateParam = searchParams.get("date");
  const referenceDate = dateParam ? new Date(dateParam + "T00:00:00") : new Date();
  const weekStartDate = getWeekStartDate(referenceDate);

  const [trainingDay, setTrainingDay] = useState<TrainingDay | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [experienceTier, setExperienceTier] = useState("beginner");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [previousSets, setPreviousSets] = useState<WorkoutSet[]>([]);
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
  const [showDebug, setShowDebug] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebug = (label: string, value: any) => {
    const msg = `[WO-DEBUG] ${label}: ${typeof value === "object" ? JSON.stringify(value, null, 2) : value}`;
    console.log(msg);
    setDebugLog((prev) => [...prev, `${new Date().toISOString().slice(11, 19)} ${label}: ${typeof value === "object" ? JSON.stringify(value) : value}`]);
  };

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

      setDebugLog([]);
      addDebug("dateParam (from URL)", dateParam);
      addDebug("referenceDate", referenceDate.toISOString());
      addDebug("computedWeekStartDate", weekStartDate);
      addDebug("training_day_id", trainingDayId);
      addDebug("user_id", user.id);

      // 1. Fetch template data + onboarding in parallel
      const [dayRes, exercisesRes, onboardingRes] = await Promise.all([
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

      const tier = onboardingRes.data?.experience_tier || "beginner";
      if (onboardingRes.data) setExperienceTier(tier);

      // 2. Upsert session: INSERT ON CONFLICT DO NOTHING, then SELECT
      addDebug("SESSION UPSERT query", {
        table: "workout_sessions",
        action: "insert",
        filters: { user_id: user.id, training_day_id: trainingDayId, week_start_date: weekStartDate },
      });

      await supabase
        .from("workout_sessions")
        .insert({
          user_id: user.id,
          training_day_id: trainingDayId,
          week_start_date: weekStartDate,
          status: "in_progress",
        } as any)
        .select()
        .maybeSingle();

      const { data: sessionRow } = await supabase
        .from("workout_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("training_day_id", trainingDayId)
        .eq("week_start_date", weekStartDate)
        .maybeSingle();

      const sessionId = (sessionRow as any)?.id as string | null;
      const sessionStatus = (sessionRow as any)?.status as string | undefined;
      setCurrentSessionId(sessionId);

      addDebug("resolved currentSessionId", sessionId);
      addDebug("session status", sessionStatus);
      addDebug("full session row", sessionRow);

      if (sessionStatus === "completed") {
        setWorkoutCompleted(true);
      }

      // 3. Load current session's sets
      let loadedSets: WorkoutSet[] = [];
      if (sessionId) {
        addDebug("CURRENT SETS query", {
          table: "workout_sets",
          filter: { session_id: sessionId },
          NOTE: "✅ CORRECT: filtered by session_id only",
        });

        const { data: setsData } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("session_id", sessionId);
        loadedSets = (setsData || []) as any[];
        setCurrentSets(loadedSets);

        addDebug("currentSets count", loadedSets.length);
        addDebug("currentSets data", loadedSets.map((s) => ({
          exercise: s.training_exercise_id.slice(0, 8),
          set: s.set_index,
          weight: s.weight_kg,
          reps: s.reps,
        })));
      }

      // 4. Load previous session's sets (for "Prev" column)
      addDebug("PREV SESSION query", {
        table: "workout_sessions",
        filters: { user_id: user.id, training_day_id: trainingDayId, week_start_date_lt: weekStartDate },
        order: "week_start_date DESC",
        limit: 1,
      });

      const { data: prevSession } = await supabase
        .from("workout_sessions")
        .select("id, week_start_date")
        .eq("user_id", user.id)
        .eq("training_day_id", trainingDayId)
        .lt("week_start_date", weekStartDate)
        .order("week_start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      addDebug("prevSession result", prevSession);

      if (prevSession) {
        const { data: prevSetsData } = await supabase
          .from("workout_sets")
          .select("*")
          .eq("session_id", (prevSession as any).id);
        setPreviousSets((prevSetsData || []) as any[]);
        addDebug("previousSets count (display only, NOT used for inputs)", (prevSetsData || []).length);
      } else {
        addDebug("previousSets", "none found");
      }

      // 5. Initialize set inputs from current session's sets ONLY
      addDebug("HYDRATION SOURCE", loadedSets.length > 0
        ? "✅ A) workout_sets WHERE session_id = currentSessionId"
        : "✅ A) BLANK — no sets in current session, inputs will be empty"
      );

      if (exerciseData.length > 0) {
        const inputs: Record<string, SetInput[]> = {};

        mappedExercises.forEach((ex) => {
          const setCount = getSetCountForTier(ex, tier);
          const existingSets = loadedSets.filter(
            (s) => s.training_exercise_id === ex.id
          );
          const isDuration = getPrescriptionType(ex.reps) === "duration";

          inputs[ex.id] = Array.from({ length: setCount }, (_, i) => {
            const ws = existingSets.find((s) => s.set_index === i + 1);
            return {
              weight: ws?.weight_kg?.toString() || "",
              reps: ws?.reps?.toString() || "",
              duration: isDuration ? (ws?.duration_seconds?.toString() || "") : "",
              saved: !!ws,
            };
          });

          // Log per-exercise hydration
          if (existingSets.length > 0) {
            addDebug(`hydration[${ex.name}]`, existingSets.map((s) => ({
              set: s.set_index,
              weight: s.weight_kg,
              reps: s.reps,
              source_session_id: s.session_id.slice(0, 8),
            })));
          }
        });

        setSetInputs(inputs);
        if (mappedExercises.length > 0) {
          setExpandedExercise(mappedExercises[0].id);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, [user, trainingDayId, weekStartDate]);

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

  const getPreviousSet = (exerciseId: string, setIndex: number): WorkoutSet | undefined => {
    return previousSets.find(
      (s) => s.training_exercise_id === exerciseId && s.set_index === setIndex
    );
  };

  const detectPBs = async (exerciseId: string, weight: number, reps: number) => {
    if (!user || !currentSessionId) return [];
    // Query all-time best for this exercise excluding current session
    const { data: history } = await supabase
      .from("workout_sets")
      .select("weight_kg, reps, session_id")
      .eq("training_exercise_id", exerciseId)
      .neq("session_id", currentSessionId);

    const historicalSets = (history || []) as any[];
    const pbs: PBType[] = [];

    const maxWeight = Math.max(0, ...historicalSets.map((s: any) => s.weight_kg || 0));
    if (weight > maxWeight) pbs.push("weight");

    const sameWeightSets = historicalSets.filter((s: any) => s.weight_kg === weight);
    const maxRepsAtWeight = Math.max(0, ...sameWeightSets.map((s: any) => s.reps || 0));
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
    if (!user || !currentSessionId) return;

    const input = setInputs[exerciseId]?.[setIndex];
    if (!input) return;

    const exercise = exercises.find((ex) => ex.id === exerciseId);
    const isDuration = exercise ? getPrescriptionType(exercise.reps) === "duration" : false;

    const weightKg = isDuration ? null : (input.weight ? parseFloat(input.weight) : null);
    const repsVal = isDuration ? null : (input.reps ? parseInt(input.reps, 10) : null);
    const durationSeconds = isDuration ? (input.duration ? parseInt(input.duration, 10) : null) : null;

    // Check for existing set in current session
    const existing = currentSets.find(
      (s) => s.training_exercise_id === exerciseId && s.set_index === setIndex + 1
    );

    if (existing) {
      await supabase
        .from("workout_sets")
        .update({
          weight_kg: weightKg,
          reps: repsVal,
          duration_seconds: durationSeconds,
        } as any)
        .eq("id", existing.id);

      setCurrentSets((prev) =>
        prev.map((s) =>
          s.id === existing.id
            ? { ...s, weight_kg: weightKg, reps: repsVal, duration_seconds: durationSeconds }
            : s
        )
      );
    } else {
      const { data } = await supabase
        .from("workout_sets")
        .insert({
          session_id: currentSessionId,
          training_exercise_id: exerciseId,
          set_index: setIndex + 1,
          weight_kg: weightKg,
          reps: repsVal,
          duration_seconds: durationSeconds,
        } as any)
        .select()
        .single();

      if (data) {
        setCurrentSets((prev) => [...prev, data as any]);
      }
    }

    // Detect PBs for reps-based exercises
    if (!isDuration && weightKg && repsVal) {
      const pbs = await detectPBs(exerciseId, weightKg, repsVal);
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

      if (isDuration) continue;

      let exerciseVolume = 0;
      sets.forEach((s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        exerciseVolume += w * r;
      });
      totalVolume += exerciseVolume;

      const prevExSets = previousSets.filter((s) => s.training_exercise_id === exercise.id);
      const prevVolume = prevExSets.reduce(
        (sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0),
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
        const prevMaxWeight = Math.max(0, ...prevExSets.map((s) => s.weight_kg || 0));
        if (currentMaxWeight > prevMaxWeight && prevMaxWeight > 0) {
          improvements.push({
            name: exercise.name,
            type: "weight",
            detail: `${prevMaxWeight} → ${currentMaxWeight} kg`,
          });
        }
      }
    }

    const prevTotalVolume = previousSets.reduce(
      (sum, s) => sum + (s.weight_kg || 0) * (s.reps || 0),
      0
    );

    const { data: weekSchedule } = await supabase
      .from("user_training_schedule")
      .select("completed")
      .eq("user_id", user.id)
      .eq("week_start_date", weekStartDate);

    const weeklyTotal = weekSchedule?.length || 0;
    const weeklyCompleted = weekSchedule?.filter((s) => s.completed).length || 0;

    setSummaryData({
      improvements,
      totalVolume,
      prevVolume: previousSets.length > 0 ? prevTotalVolume : null,
      weeklyCompleted,
      weeklyTotal: Math.max(weeklyTotal, 1),
    });
  };

  const completeWorkout = async () => {
    if (!user || !trainingDayId || !currentSessionId) return;
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

      // Mark session as completed
      await supabase
        .from("workout_sessions")
        .update({ status: "completed", performed_at: new Date().toISOString() } as any)
        .eq("id", currentSessionId);

      // Also update user_training_schedule for consistency
      const { data: existing } = await supabase
        .from("user_training_schedule")
        .select("id")
        .eq("user_id", user.id)
        .eq("training_day_id", trainingDayId)
        .eq("week_start_date", weekStartDate)
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
          week_start_date: weekStartDate,
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

  const isLocked = !warmupComplete && !workoutCompleted && currentSets.length === 0;

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
        {/* Debug Panel Toggle */}
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="fixed top-2 right-2 z-50 bg-destructive text-destructive-foreground text-[10px] px-2 py-1 rounded font-mono"
        >
          {showDebug ? "Hide Debug" : "🐛 Debug"}
        </button>

        {showDebug && (
          <div className="fixed inset-x-0 top-8 z-50 mx-2 max-h-[50vh] overflow-auto bg-card border border-border rounded-lg p-3 shadow-lg">
            <div className="text-[10px] font-mono space-y-0.5 text-foreground">
              <div className="font-bold text-primary mb-1">Workout Debug Panel</div>
              <div><span className="text-muted-foreground">sessionId:</span> {currentSessionId?.slice(0, 8) || "null"}</div>
              <div><span className="text-muted-foreground">weekStartDate:</span> {weekStartDate}</div>
              <div><span className="text-muted-foreground">dateParam:</span> {dateParam || "null"}</div>
              <div><span className="text-muted-foreground">trainingDayId:</span> {trainingDayId?.slice(0, 8)}</div>
              <div><span className="text-muted-foreground">currentSets:</span> {currentSets.length}</div>
              <div><span className="text-muted-foreground">previousSets:</span> {previousSets.length}</div>
              <hr className="border-border my-1" />
              {debugLog.map((line, i) => (
                <div key={i} className={line.includes("✅") ? "text-green-500" : line.includes("❌") ? "text-destructive" : ""}>{line}</div>
              ))}
            </div>
          </div>
        )}

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
                        const prevSet = getPreviousSet(exercise.id, setIdx + 1);
                        const pbKey = `${exercise.id}-${setIdx}`;
                        const pbs = pbFlags[pbKey] || [];

                        return (
                          <div key={setIdx} className="space-y-1">
                            {isDuration ? (
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
                                  {prevSet?.duration_seconds ? (
                                    <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                      <Clock className="h-3 w-3" />
                                      {prevSet.duration_seconds}s
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </div>
                              </div>
                            ) : (
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
                                  {prevSet ? (
                                    <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">
                                      <TrendingUp className="h-3 w-3" />
                                      {prevSet.weight_kg}×{prevSet.reps}
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
