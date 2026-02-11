import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Sun,
  Moon,
  Dumbbell,
  BookOpen,
  ChevronRight,
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

export default function DashboardPage() {
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

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

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

      const today = new Date().getDay();
      const todayDate = format(new Date(), "yyyy-MM-dd");

      const [blocksRes, streaksRes] = await Promise.all([
        supabase
          .from("schedule_blocks")
          .select("*")
          .eq("user_id", user.id)
          .eq("day_of_week", today)
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
            .eq("completed_date", todayDate),
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
        .eq("day_of_week", today)
        .eq("completed", true)
        .limit(1);

      completions.training = (trainingData?.length ?? 0) > 0;

      const { data: readingData } = await supabase
        .from("reading_logs")
        .select("pages_read, minutes_read")
        .eq("user_id", user.id)
        .eq("log_date", todayDate)
        .maybeSingle();

      completions.reading =
        !!readingData &&
        ((readingData.pages_read ?? 0) > 0 || (readingData.minutes_read ?? 0) > 0);

      setAnchorCompletions(completions);
    };

    fetchData();
  }, [user, navigate]);

  // Daily completion % calculation
  const getDailyCompletion = useCallback(() => {
    let total = habitCounts.total;
    let completed = habitCounts.completed;

    // Training counts if scheduled today
    const hasTraining = todayBlocks.some((b) => b.block_type === "training");
    if (hasTraining) {
      total++;
      if (anchorCompletions.training) completed++;
    }

    // Morning routine counts if scheduled today
    const hasMorning = todayBlocks.some((b) => b.block_type === "morning_routine");
    if (hasMorning) {
      total++;
      if (anchorCompletions.morning_routine) completed++;
    }

    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [habitCounts, todayBlocks, anchorCompletions]);

  const handleAnchorClick = (block: ScheduleBlock) => {
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
          className="flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
            <p className="text-muted-foreground">
              {format(currentTime, "EEEE, MMMM d")}
            </p>
          </div>
          <div className="text-right flex-1 min-w-0">
            <p className="text-sm italic text-muted-foreground leading-relaxed">
              "{getTodayQuote().text}"
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              — {getTodayQuote().author}
            </p>
          </div>
        </motion.header>

        {/* Daily Completion + Streaks */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 items-stretch"
        >
          {/* Completion % */}
          <div className="flex-[1.5] card-stat flex flex-col justify-center gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">Today: {completionPct}%</span>
            <ProgressBar value={completionPct} />
          </div>

          {/* Training Streak */}
          <div className="flex-1 card-stat flex items-center gap-2 p-3">
            <Flame className={cn("h-4 w-4", trainingStreak > 0 ? "text-primary" : "text-muted-foreground")} />
            <div>
              <span className="text-lg font-semibold">{trainingStreak}</span>
              <span className="text-xs text-muted-foreground ml-1">Training</span>
            </div>
          </div>

          {/* Morning Streak */}
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
          <h2 className="text-sm font-medium text-muted-foreground">Today's Anchors</h2>

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
                    className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card cursor-pointer active:scale-[0.98] transition-transform"
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
          />
        </>
      )}
    </MobileLayout>
  );
}
