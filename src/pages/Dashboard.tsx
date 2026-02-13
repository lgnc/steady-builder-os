import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, startOfWeek, subDays, addDays, isToday, isBefore, startOfDay, differenceInCalendarDays } from "date-fns";
import {
  Sun,
  Moon,
  Dumbbell,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Flame,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getTodayQuote } from "@/data/dailyQuotes";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { cn } from "@/lib/utils";
import { CoachChat } from "@/components/dashboard/CoachChat";
import { DailyHabits } from "@/components/dashboard/DailyHabits";
import { RoutineChecklistSheet } from "@/components/calendar/RoutineChecklistSheet";
import { TrainingBlockSheet } from "@/components/calendar/TrainingBlockSheet";
import { ReadingLogSheet } from "@/components/dashboard/ReadingLogSheet";
import { ProgressBar } from "@/components/ui/progress-bar";
import { toast } from "sonner";
import { useDay28Review } from "@/hooks/useDay28Review";
import { Day28ReviewModal } from "@/components/profile/Day28ReviewModal";

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

interface Streak {
  streak_type: string;
  current_streak: number;
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
  const [streaks, setStreaks] = useState<Streak[]>([]);
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

      const [blocksRes, streaksRes] = await Promise.all([
        supabase
          .from("schedule_blocks")
          .select("*")
          .eq("user_id", user.id)
          .eq("day_of_week", dayOfWeek)
          .order("start_time"),
        supabase
          .from("streaks")
          .select("streak_type, current_streak")
          .eq("user_id", user.id)
          .in("streak_type", ["training", "morning_routine"]),
      ]);

      if (blocksRes.data) setTodayBlocks(blocksRes.data);
      if (streaksRes.data) setStreaks(streaksRes.data);

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

      const { data: trainingData } = await supabase
        .from("user_training_schedule")
        .select("completed")
        .eq("user_id", user.id)
        .eq("day_of_week", dayOfWeek)
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
          const { data: mealCompletions } = await supabase
            .from("meal_completions")
            .select("meal_slot")
            .eq("user_id", user.id)
            .eq("meal_plan_id", mealPlan.id)
            .eq("meal_date", selectedDateStr)
            .eq("completed", true);

          setNutritionCounts({ total: totalMeals, completed: mealCompletions?.length ?? 0 });
        } else {
          setNutritionCounts({ total: 0, completed: 0 });
        }
      } else {
        setNutritionCounts({ total: 0, completed: 0 });
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

  const anchorBlocks = todayBlocks.filter((b) => ANCHOR_TYPES.includes(b.block_type));
  const seenTypes = new Set<string>();
  const uniqueAnchors = anchorBlocks.filter((b) => {
    if (seenTypes.has(b.block_type)) return false;
    seenTypes.add(b.block_type);
    return true;
  });

  const trainingStreak = streaks.find((s) => s.streak_type === "training")?.current_streak ?? 0;
  const morningStreak = streaks.find((s) => s.streak_type === "morning_routine")?.current_streak ?? 0;
  const completionPct = getDailyCompletion();

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

        {/* Daily Completion + Streaks */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 items-stretch"
        >
          <div className="flex-[1.5] card-stat flex flex-col justify-center gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{viewingToday ? "Today" : format(selectedDate, "EEE")}: {completionPct}%</span>
            <ProgressBar value={completionPct} />
          </div>

          <div className="flex-1 card-stat flex items-center gap-2 p-3">
            <Flame className={cn("h-4 w-4", trainingStreak > 0 ? "text-primary" : "text-muted-foreground")} />
            <div>
              <span className="text-lg font-semibold">{trainingStreak}</span>
              <span className="text-xs text-muted-foreground ml-1">Training</span>
            </div>
          </div>

          <div className="flex-1 card-stat flex items-center gap-2 p-3">
            <Flame className={cn("h-4 w-4", morningStreak > 0 ? "text-primary" : "text-muted-foreground")} />
            <div>
              <span className="text-lg font-semibold">{morningStreak}</span>
              <span className="text-xs text-muted-foreground ml-1">Morning</span>
            </div>
          </div>
        </motion.section>

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
                      "flex items-center gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.98] transition-transform",
                      viewingFuture && "opacity-60"
                    )}
                    onClick={() => handleAnchorClick(block)}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-sm font-medium">{config.label}</span>
                    {completed && (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.section>

      </div>

      <CoachChat />

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
