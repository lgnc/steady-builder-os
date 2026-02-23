import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, startOfWeek, subDays, addDays, isToday, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
import { getWeekStartDate } from "@/lib/weekUtils";
import {
  Sun,
  Moon,
  Dumbbell,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  CheckCircle2,
  Utensils,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTodayQuote } from "@/data/dailyQuotes";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DailyRecap } from "@/components/dashboard/DailyRecap";
import { DailyHabits } from "@/components/dashboard/DailyHabits";
import { RoutineChecklistSheet } from "@/components/calendar/RoutineChecklistSheet";
import { TrainingBlockSheet } from "@/components/calendar/TrainingBlockSheet";
import { ReadingLogSheet } from "@/components/dashboard/ReadingLogSheet";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "sonner";
import { useDay28Review } from "@/hooks/useDay28Review";
import BonusMaterial from "@/components/dashboard/BonusMaterial";
import { Day28ReviewModal } from "@/components/profile/Day28ReviewModal";
import { EightWeekGoalsCard } from "@/components/dashboard/EightWeekGoalsCard";

interface ScheduleBlock {
  id: string;
  block_type: string;
  title: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_locked: boolean;
  training_day_id: string | null;
}

interface WeeklyCompletion {
  habitsPercent: number;
  trainingCompleted: number;
  trainingTotal: number;
  nutritionPercent: number;
}

const ANCHOR_TYPES = ["morning_routine", "training", "reading", "evening_routine"];

const ANCHOR_CONFIG: Record<string, { label: string; icon: typeof Sun }> = {
  morning_routine: { label: "Morning Routine", icon: Sun },
  training: { label: "Today's Training", icon: Dumbbell },
  reading: { label: "Reading", icon: BookOpen },
  evening_routine: { label: "Evening Routine", icon: Moon },
};

function formatDateLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = differenceInCalendarDays(today, target);

  if (diff === 0) return `Today • ${format(date, "EEE d MMM")}`;
  if (diff === 1) return `Yesterday • ${format(date, "EEE d MMM")}`;
  return format(date, "EEE d MMM");
}

function canEditDate(date: Date): boolean {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diff = differenceInCalendarDays(today, target);
  // Can edit today, yesterday, and day before (48h window)
  return diff >= 0 && diff <= 2;
}

function isFutureDate(date: Date): boolean {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  return target > today;
}

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todayBlocks, setTodayBlocks] = useState<ScheduleBlock[]>([]);
  const [weeklyCompletion, setWeeklyCompletion] = useState<WeeklyCompletion | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [routineSheetType, setRoutineSheetType] = useState("morning_routine");
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [trainingBlock, setTrainingBlock] = useState<ScheduleBlock | null>(null);
  const [readingSheetOpen, setReadingSheetOpen] = useState(false);
  const [anchorCompletions, setAnchorCompletions] = useState<Record<string, boolean>>({});
  const [habitCounts, setHabitCounts] = useState({ total: 0, completed: 0 });
  const [nutritionCounts, setNutritionCounts] = useState({ total: 0, completed: 0 });
  const [nutritionProgress, setNutritionProgress] = useState<{
    consumedCalories: number;
    consumedProtein: number;
    targetCalories: number;
    targetProtein: number;
  } | null>(null);

  const { user, loading: authLoading } = useAuth();
  const day28 = useDay28Review(user?.id);
  const navigate = useNavigate();

  const viewingToday = isToday(selectedDate);
  const viewingFuture = isFutureDate(selectedDate);
  const editable = canEditDate(selectedDate);
  const selectedDateStr = format(selectedDate, "yyyy-MM-dd");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: onboardingData } = await supabase
        .from("onboarding_data")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (!onboardingData?.onboarding_completed) {
        navigate("/onboarding");
        return;
      }

      const dayOfWeek = selectedDate.getDay();

      const { data: blocksData } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .order("start_time");

      if (blocksData) setTodayBlocks(blocksData);

      // Fetch completion data for anchors
      const completions: Record<string, boolean> = {};

      const routineTypes = ["morning_routine", "evening_routine"];
      for (const rt of routineTypes) {
        const [itemsRes, completionsRes] = await Promise.all([
          supabase
            .from("routine_checklist_items")
            .select("id")
            .eq("user_id", user.id)
            .eq("routine_type", rt),
          supabase
            .from("routine_checklist_completions")
            .select("checklist_item_id")
            .eq("user_id", user.id)
            .eq("completed_date", selectedDateStr),
        ]);

        const totalItems = itemsRes.data?.length ?? 0;
        if (totalItems > 0) {
          const itemIds = new Set(itemsRes.data!.map((i) => i.id));
          const completedForType = completionsRes.data?.filter((c) =>
            itemIds.has(c.checklist_item_id)
          ).length ?? 0;
          completions[rt] = completedForType >= totalItems;
        }
      }

      const weekStart = getWeekStartDate(selectedDate);
      const { data: trainingData } = await supabase
        .from("user_training_schedule")
        .select("completed")
        .eq("user_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .eq("week_start_date", weekStart)
        .eq("completed", true)
        .limit(1);

      completions.training = (trainingData?.length ?? 0) > 0;

      const { data: readingData } = await supabase
        .from("reading_logs")
        .select("pages_read, minutes_read")
        .eq("user_id", user.id)
        .eq("log_date", selectedDateStr)
        .maybeSingle();

      completions.reading =
        !!readingData &&
        ((readingData.pages_read ?? 0) > 0 || (readingData.minutes_read ?? 0) > 0);

      setAnchorCompletions(completions);

      // Fetch nutrition meal counts for selected date
      const { data: mealPlan } = await supabase
        .from("meal_plans")
        .select("id, plan_data, week_start")
        .eq("user_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (mealPlan?.plan_data) {
        const monday = startOfWeek(new Date(mealPlan.week_start + "T00:00:00"), { weekStartsOn: 1 });
        const diff = Math.floor((selectedDate.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        const todayDayIndex = Math.max(1, Math.min(7, diff + 1));
        const planData = mealPlan.plan_data as any;
        const todayMeals = planData?.days?.find((d: any) => d.day === todayDayIndex)?.meals || [];
        const totalMeals = todayMeals.length;

        if (totalMeals > 0) {
          const [mealCompletionsRes, nutritionProfileRes] = await Promise.all([
            supabase
              .from("meal_completions")
              .select("meal_slot")
              .eq("user_id", user.id)
              .eq("meal_plan_id", mealPlan.id)
              .eq("meal_date", selectedDateStr)
              .eq("completed", true),
            supabase
              .from("nutrition_profiles")
              .select("calorie_target, protein_g")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle(),
          ]);

          const completedSlots = new Set((mealCompletionsRes.data ?? []).map((c: any) => c.meal_slot));
          setNutritionCounts({ total: totalMeals, completed: completedSlots.size });

          // Compute consumed calories/protein from completed meals
          let consumedCalories = 0;
          let consumedProtein = 0;
          for (const meal of todayMeals) {
            if (completedSlots.has(meal.slot)) {
              consumedCalories += meal.calories ?? 0;
              consumedProtein += meal.protein_g ?? 0;
            }
          }

          if (nutritionProfileRes.data) {
            setNutritionProgress({
              consumedCalories,
              consumedProtein,
              targetCalories: nutritionProfileRes.data.calorie_target,
              targetProtein: nutritionProfileRes.data.protein_g,
            });
          } else {
            setNutritionProgress(null);
          }
        } else {
          setNutritionCounts({ total: 0, completed: 0 });
          setNutritionProgress(null);
        }
      } else {
        setNutritionCounts({ total: 0, completed: 0 });
        setNutritionProgress(null);
      }
    };

    fetchData();
  }, [user, navigate, selectedDate, selectedDateStr]);

  // Daily completion % calculation
  const getDailyCompletion = useCallback(() => {
    let total = habitCounts.total;
    let completed = habitCounts.completed;

    const hasTraining = todayBlocks.some((b) => b.block_type === "training");
    if (hasTraining) {
      total++;
      if (anchorCompletions.training) completed++;
    }

    const hasMorning = todayBlocks.some((b) => b.block_type === "morning_routine");
    if (hasMorning) {
      total++;
      if (anchorCompletions.morning_routine) completed++;
    }

    total += nutritionCounts.total;
    completed += nutritionCounts.completed;

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [habitCounts, todayBlocks, anchorCompletions, nutritionCounts]);

  const handleAnchorClick = (block: ScheduleBlock) => {
    if (viewingFuture) {
      toast("You can't complete future tasks.");
      return;
    }
    if (!editable) {
      toast("This day is outside the editable window.");
      return;
    }

    switch (block.block_type) {
      case "morning_routine":
      case "evening_routine":
        setRoutineSheetType(block.block_type);
        setRoutineSheetOpen(true);
        break;
      case "training":
        if (block.training_day_id) {
          setTrainingBlock(block);
          setTrainingSheetOpen(true);
        } else {
          navigate("/training");
        }
        break;
      case "reading":
        setReadingSheetOpen(true);
        break;
    }
  };

  const goToPreviousDay = () => setSelectedDate((d) => subDays(d, 1));
  const goToNextDay = () => setSelectedDate((d) => addDays(d, 1));

  const anchorsRef = useRef<HTMLDivElement>(null);

  const anchorBlocks = todayBlocks.filter((b) => ANCHOR_TYPES.includes(b.block_type));
  const seenTypes = new Set<string>();
  const uniqueAnchors = anchorBlocks.filter((b) => {
    if (seenTypes.has(b.block_type)) return false;
    seenTypes.add(b.block_type);
    return true;
  });

  const completionPct = getDailyCompletion();

  // Fetch weekly completion data
  useEffect(() => {
    if (!user) return;
    const fetchWeekly = async () => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const today = now < startOfWeek(now, { weekStartsOn: 0 }) ? now : now;
      const daysElapsed = Math.min(7, Math.floor((now.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      const startStr = format(weekStart, "yyyy-MM-dd");
      const endStr = format(now, "yyyy-MM-dd");

      const daysOfWeek: number[] = [];
      for (let i = 0; i < daysElapsed; i++) {
        daysOfWeek.push((weekStart.getDay() + i) % 7);
      }

      const [trainingBlocks, trainingDone, habitsRes, completionsRes, mealPlansRes, mealCompletionsRes] = await Promise.all([
        supabase.from("schedule_blocks").select("day_of_week").eq("user_id", user.id).eq("block_type", "training").in("day_of_week", daysOfWeek),
        supabase.from("user_training_schedule").select("day_of_week, completed").eq("user_id", user.id).eq("completed", true).in("day_of_week", daysOfWeek),
        supabase.from("habits").select("id").eq("user_id", user.id).eq("is_active", true),
        supabase.from("habit_completions").select("completed_date").eq("user_id", user.id).gte("completed_date", startStr).lte("completed_date", endStr),
        supabase.from("meal_plans").select("plan_data").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1),
        supabase.from("meal_completions").select("completed").eq("user_id", user.id).eq("completed", true).gte("meal_date", startStr).lte("meal_date", endStr),
      ]);

      const trainingTotal = new Set((trainingBlocks.data || []).map(b => b.day_of_week)).size;
      const trainingCompleted = new Set((trainingDone.data || []).map(s => s.day_of_week)).size;

      const habitCount = habitsRes.data?.length || 0;
      const totalPossible = habitCount * daysElapsed;
      const totalCompleted = completionsRes.data?.length || 0;
      const habitsPercent = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

      let nutritionPercent = 0;
      if (mealPlansRes.data?.length) {
        const planData = mealPlansRes.data[0].plan_data as any;
        const days = planData?.days || [];
        let totalMeals = 0;
        for (const day of days) totalMeals += (day.meals?.length || 0);
        const mealsPerDay = days.length > 0 ? totalMeals / days.length : 0;
        const expectedMeals = Math.round(mealsPerDay * daysElapsed);
        nutritionPercent = expectedMeals > 0 ? Math.round(((mealCompletionsRes.data?.length || 0) / expectedMeals) * 100) : 0;
      }

      setWeeklyCompletion({ habitsPercent, trainingCompleted, trainingTotal, nutritionPercent });
    };
    fetchWeekly();
  }, [user, selectedDate]);

  // Quick action button logic
  const isEvening = currentTime.getHours() >= 17;
  const ritualType = isEvening ? "evening_routine" : "morning_routine";
  const ritualLabel = isEvening ? "Evening Journal" : "Morning Journal";
  const RitualIcon = isEvening ? Moon : Sun;
  const ritualCompleted = !!anchorCompletions[ritualType];

  const isTrainingDay = todayBlocks.some((b) => b.block_type === "training");
  const trainingCompleted = !!anchorCompletions.training;
  const trainingBlockForAction = todayBlocks.find((b) => b.block_type === "training") ?? null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="px-6 py-6 space-y-8">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-1"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
            </div>
            {viewingToday && (
              <div className="text-right flex-1 min-w-0">
                <p className="text-sm italic text-muted-foreground leading-relaxed">
                  "{getTodayQuote().text}"
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  — {getTodayQuote().author}
                </p>
              </div>
            )}
          </div>

          {/* Date navigation */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={goToPreviousDay}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              {formatDateLabel(selectedDate)}
            </span>
            <button
              onClick={goToNextDay}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Past day indicator */}
          {!viewingToday && !viewingFuture && (
            <p className="text-xs text-muted-foreground/60 italic">Viewing past day</p>
          )}
          {viewingFuture && (
            <p className="text-xs text-muted-foreground/60 italic">Viewing future day</p>
          )}
        </motion.header>

        {/* Daily Completion */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="card-stat flex flex-col justify-center gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{viewingToday ? "Today" : format(selectedDate, "EEE")}: {completionPct}%</span>
            <ProgressBar value={completionPct} />
          </div>

          {/* Weekly Completion */}
          {weeklyCompletion && (
            <div className="card-stat p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">This Week</span>
                <span className="text-xs text-muted-foreground">Target: 85%</span>
              </div>

              {/* Habits */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className={cn("h-3.5 w-3.5", weeklyCompletion.habitsPercent >= 85 ? "text-primary" : weeklyCompletion.habitsPercent >= 50 ? "text-amber-500" : "text-destructive")} />
                    <span className="text-xs">Habits</span>
                  </div>
                  <span className={cn("text-xs font-semibold", weeklyCompletion.habitsPercent >= 85 ? "text-primary" : weeklyCompletion.habitsPercent >= 50 ? "text-amber-500" : "text-destructive")}>
                    {weeklyCompletion.habitsPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", weeklyCompletion.habitsPercent >= 85 ? "bg-primary" : weeklyCompletion.habitsPercent >= 50 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${Math.min(100, weeklyCompletion.habitsPercent)}%` }} />
                </div>
              </div>

              {/* Training */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Dumbbell className={cn("h-3.5 w-3.5", weeklyCompletion.trainingTotal > 0 && weeklyCompletion.trainingCompleted >= weeklyCompletion.trainingTotal * 0.85 ? "text-primary" : weeklyCompletion.trainingCompleted > 0 ? "text-amber-500" : "text-destructive")} />
                    <span className="text-xs">Training</span>
                  </div>
                  <span className={cn("text-xs font-semibold", weeklyCompletion.trainingTotal > 0 && weeklyCompletion.trainingCompleted >= weeklyCompletion.trainingTotal * 0.85 ? "text-primary" : weeklyCompletion.trainingCompleted > 0 ? "text-amber-500" : "text-destructive")}>
                    {weeklyCompletion.trainingTotal > 0 ? Math.round((weeklyCompletion.trainingCompleted / weeklyCompletion.trainingTotal) * 100) : 0}% ({weeklyCompletion.trainingCompleted}/{weeklyCompletion.trainingTotal})
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", weeklyCompletion.trainingTotal > 0 && weeklyCompletion.trainingCompleted >= weeklyCompletion.trainingTotal * 0.85 ? "bg-primary" : weeklyCompletion.trainingCompleted > 0 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${weeklyCompletion.trainingTotal > 0 ? Math.min(100, (weeklyCompletion.trainingCompleted / weeklyCompletion.trainingTotal) * 100) : 0}%` }} />
                </div>
              </div>

              {/* Nutrition */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Utensils className={cn("h-3.5 w-3.5", weeklyCompletion.nutritionPercent >= 85 ? "text-primary" : weeklyCompletion.nutritionPercent >= 50 ? "text-amber-500" : "text-destructive")} />
                    <span className="text-xs">Nutrition</span>
                  </div>
                  <span className={cn("text-xs font-semibold", weeklyCompletion.nutritionPercent >= 85 ? "text-primary" : weeklyCompletion.nutritionPercent >= 50 ? "text-amber-500" : "text-destructive")}>
                    {weeklyCompletion.nutritionPercent}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-500", weeklyCompletion.nutritionPercent >= 85 ? "bg-primary" : weeklyCompletion.nutritionPercent >= 50 ? "bg-amber-500" : "bg-destructive")} style={{ width: `${Math.min(100, weeklyCompletion.nutritionPercent)}%` }} />
                </div>
              </div>
            </div>
          )}
        </motion.section>

        {/* 8-Week Goals */}
        {user && <EightWeekGoalsCard userId={user.id} />}

        {/* Quick Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-2"
        >
          {/* Ritual Button */}
          <Button
            variant={ritualCompleted ? "outline" : "default"}
            size="lg"
            className="w-full justify-between"
            disabled={viewingFuture}
            onClick={() => {
              if (viewingFuture) return;
              if (!editable) { toast("This day is outside the editable window."); return; }
              setRoutineSheetType(ritualType);
              setRoutineSheetOpen(true);
            }}
          >
            <span className="flex items-center gap-2">
              <RitualIcon className="h-5 w-5" />
              {ritualLabel}{ritualCompleted ? " ✓" : ""}
            </span>
            {!ritualCompleted && <ChevronRight className="h-4 w-4 opacity-60" />}
          </Button>

          {/* Training Button */}
          {isTrainingDay ? (
            <Button
              variant={trainingCompleted ? "outline" : "default"}
              size="lg"
              className="w-full justify-between"
              disabled={viewingFuture || trainingCompleted}
              onClick={() => {
                if (viewingFuture || trainingCompleted) return;
                if (!editable) { toast("This day is outside the editable window."); return; }
                if (trainingBlockForAction?.training_day_id) {
                  setTrainingBlock(trainingBlockForAction);
                  setTrainingSheetOpen(true);
                } else {
                  navigate("/training");
                }
              }}
            >
              <span className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {trainingCompleted ? "Training Complete ✓" : "Start Today's Training"}
              </span>
              {!trainingCompleted && <ChevronRight className="h-4 w-4 opacity-60" />}
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="lg"
              className="w-full justify-start opacity-60"
              disabled
            >
              <span className="flex flex-col items-start">
                <span className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  Rest Day
                </span>
                <span className="text-xs font-normal text-muted-foreground">Recovery is the work.</span>
              </span>
            </Button>
          )}
        </motion.div>

        {/* Nutrition Progress */}
        {nutritionProgress && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-stat p-3"
          >
            <span className="text-xs font-medium text-muted-foreground block mb-1">Nutrition</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>Calories: {nutritionProgress.consumedCalories.toLocaleString()} / {nutritionProgress.targetCalories.toLocaleString()} kcal</span>
              <span className="text-border">|</span>
              <span>Protein: {nutritionProgress.consumedProtein}g / {nutritionProgress.targetProtein}g</span>
            </div>
          </motion.div>
        )}

        {/* Daily Habits */}
        {user && (
          <DailyHabits
            userId={user.id}
            selectedDate={selectedDate}
            editable={editable && !viewingFuture}
            onCompletionChange={setHabitCounts}
          />
        )}

        {/* Today's Anchors */}
        <motion.section
          ref={anchorsRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-medium text-muted-foreground">
            {viewingToday ? "Today's Anchors" : "Anchors"}
          </h2>

          <div className="space-y-2">
            {uniqueAnchors.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Rest day. Recovery is part of the process.
              </p>
            ) : (
              uniqueAnchors.map((block, index) => {
                const config = ANCHOR_CONFIG[block.block_type];
                if (!config) return null;
                const Icon = config.icon;
                const completed = anchorCompletions[block.block_type];

                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.05 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.98] transition-transform",
                        completed && "border-primary/30 bg-primary/5",
                        viewingFuture && "opacity-60"
                      )}
                      onClick={() => handleAnchorClick(block)}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        completed ? "bg-primary/15" : "bg-muted"
                      )}>
                        <Icon className={cn("h-5 w-5", completed ? "text-primary" : "text-muted-foreground")} />
                      </div>
                      <span className="flex-1 text-base font-medium">{config.label}</span>
                      {completed && (
                        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                      )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.div>
                );
              })
            )}
          </div>
      </motion.section>

        <BonusMaterial />

    </div>

      <DailyRecap
        context={{
          completionPct,
          habitCounts,
          nutritionCounts,
          anchorCompletions,
          isTrainingDay,
          weeklyCompletion,
        }}
      />

      {user && (
        <>
          <RoutineChecklistSheet
            open={routineSheetOpen}
            onOpenChange={setRoutineSheetOpen}
            userId={user.id}
            routineType={routineSheetType}
            selectedDate={selectedDate}
          />
          <TrainingBlockSheet
            open={trainingSheetOpen}
            onOpenChange={setTrainingSheetOpen}
            block={trainingBlock}
            blocks={todayBlocks}
            userId={user.id}
            selectedDate={selectedDateStr}
            onRescheduleComplete={(updatedBlocks) => {
              setTodayBlocks(updatedBlocks);
              setTrainingSheetOpen(false);
            }}
          />
          <ReadingLogSheet
            open={readingSheetOpen}
            onOpenChange={setReadingSheetOpen}
            userId={user.id}
            selectedDate={selectedDate}
          />
          {day28.trialStart && (
            <Day28ReviewModal
              open={day28.shouldShow}
              onOpenChange={(open) => {
                if (!open) day28.dismiss();
              }}
              userId={user.id}
              trialStart={day28.trialStart}
              onDismiss={day28.dismiss}
            />
          )}
        </>
      )}
    </MobileLayout>
  );
}
