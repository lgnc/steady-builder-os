import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dumbbell, 
  ChevronRight, 
  Check, 
  Clock, 
  Flame,
  Target 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getWeekStartDate } from "@/lib/weekUtils";
import { format } from "date-fns";

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
  rest_seconds: number;
  notes: string | null;
}

interface UserSchedule {
  id: string;
  training_day_id: string;
  day_of_week: number;
  week_number: number;
  completed: boolean;
}

export default function TrainingPage() {
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>([]);
  const [exercises, setExercises] = useState<Record<string, Exercise[]>>({});
  const [userSchedule, setUserSchedule] = useState<UserSchedule[]>([]);
  const [selectedDay, setSelectedDay] = useState<TrainingDay | null>(null);
  const [experienceTier, setExperienceTier] = useState<string>("beginner");
  const [programName, setProgramName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Get user's onboarding data for program and experience tier
      const { data: onboardingData } = await supabase
        .from("onboarding_data")
        .select("selected_program, experience_tier")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!onboardingData) {
        setLoading(false);
        return;
      }

      const programKey = onboardingData.selected_program || "3_day_strength";
      setExperienceTier(onboardingData.experience_tier || "beginner");

      // Get program name
      const { data: programData } = await supabase
        .from("training_programs")
        .select("name")
        .eq("program_key", programKey)
        .single();

      if (programData) {
        setProgramName(programData.name);
      }

      // Get training days for the program
      const { data: days } = await supabase
        .from("training_days")
        .select("*")
        .eq("program_key", programKey)
        .order("day_number");

      if (days) {
        setTrainingDays(days);
        
        // Fetch exercises for all days
        const dayIds = days.map(d => d.id);
        const { data: allExercises } = await supabase
          .from("training_exercises")
          .select("*")
          .in("training_day_id", dayIds)
          .order("exercise_order");

        if (allExercises) {
          // Group exercises by training day
          const grouped: Record<string, Exercise[]> = {};
          allExercises.forEach(ex => {
            if (!grouped[ex.training_day_id]) {
              grouped[ex.training_day_id] = [];
            }
            grouped[ex.training_day_id].push(ex);
          });
          setExercises(grouped);
        }
      }

      // Get user's schedule for current week only
      const currentWeekStart = getWeekStartDate(new Date());
      const { data: schedule } = await supabase
        .from("user_training_schedule")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_start_date", currentWeekStart);

      if (schedule) {
        setUserSchedule(schedule);
      }

      setLoading(false);
    };

    fetchData();
  }, [user]);

  const getSetCount = (exercise: Exercise): number => {
    switch (experienceTier) {
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

  const isCompleted = (dayId: string): boolean => {
    return userSchedule.some(s => s.training_day_id === dayId && s.completed);
  };

  const markCompleted = async (dayId: string) => {
    if (!user) return;

    const existingSchedule = userSchedule.find(s => s.training_day_id === dayId);
    
    if (existingSchedule) {
          await supabase
            .from("user_training_schedule")
            .update({ completed: true, completed_at: new Date().toISOString() })
            .eq("id", existingSchedule.id);
    } else {
      const currentWeekStart = getWeekStartDate(new Date());
      await supabase
        .from("user_training_schedule")
        .insert({
          user_id: user.id,
          training_day_id: dayId,
          day_of_week: new Date().getDay(),
          week_number: 1,
          week_start_date: currentWeekStart,
          completed: true,
          completed_at: new Date().toISOString(),
        });
    }

    // Refresh schedule for current week
    const refreshWeekStart = getWeekStartDate(new Date());
    const { data: schedule } = await supabase
      .from("user_training_schedule")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start_date", refreshWeekStart);

    if (schedule) {
      setUserSchedule(schedule);
    }

    setSelectedDay(null);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <AnimatePresence mode="wait">
        {selectedDay ? (
          <motion.div
            key="workout"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex flex-col h-full"
          >
            {/* Workout Header */}
            <div className="px-6 py-4 border-b border-border/50">
              <button
                onClick={() => setSelectedDay(null)}
                className="text-sm text-primary mb-2 hover:underline"
              >
                ← Back to Program
              </button>
              <h1 className="text-xl font-semibold">{selectedDay.name}</h1>
              <p className="text-sm text-muted-foreground">{selectedDay.focus}</p>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-3">
                {exercises[selectedDay.id]?.map((exercise, index) => (
                  <motion.div
                    key={exercise.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-xs text-primary font-medium">
                          {index + 1}
                        </span>
                        <h3 className="font-medium">{exercise.name}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" />
                        {getSetCount(exercise)} sets × {exercise.reps}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {exercise.rest_seconds}s rest
                      </span>
                    </div>
                    
                    {exercise.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-2 italic">
                        {exercise.notes}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Complete Button */}
            <div className="px-6 py-4 border-t border-border/50 safe-bottom">
              <Button
                variant="hero"
                className="w-full gap-2"
                onClick={() => markCompleted(selectedDay.id)}
                disabled={isCompleted(selectedDay.id)}
              >
                {isCompleted(selectedDay.id) ? (
                  <>
                    <Check className="h-4 w-4" />
                    Completed
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    Complete Workout
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="program"
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="flex flex-col h-full"
          >
            {/* Program Header */}
            <div className="px-6 py-6 border-b border-border/50">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/20">
                  <Dumbbell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">{programName}</h1>
                  <p className="text-sm text-muted-foreground capitalize">
                    {experienceTier.replace("_", " ")} tier
                  </p>
                </div>
              </div>
            </div>

            {/* Training Days */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-3">
                {trainingDays.map((day, index) => {
                  const completed = isCompleted(day.id);
                  const exerciseCount = exercises[day.id]?.length || 0;
                  
                  return (
                    <motion.button
                      key={day.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => navigate(`/workout/${day.id}?date=${format(new Date(), "yyyy-MM-dd")}`)}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all duration-200",
                        completed
                          ? "bg-primary/10 border-primary/50"
                          : "bg-muted/30 border-border/50 hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              completed
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {completed ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <span className="font-semibold">{day.day_number}</span>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{day.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {day.focus} • {exerciseCount} exercises
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Info */}
            <div className="px-6 py-4 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Dumbbell className="h-3 w-3" />
                <span>Program locked for 8 weeks. Trust the process.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </MobileLayout>
  );
}
