import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Sun,
  Moon,
  Dumbbell,
  BookOpen,
  PenLine,
  ChevronRight,
  Flame,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CoachChat } from "@/components/dashboard/CoachChat";
import { DailyHabits } from "@/components/dashboard/DailyHabits";
import { RoutineChecklistSheet } from "@/components/calendar/RoutineChecklistSheet";
import { TrainingBlockSheet } from "@/components/calendar/TrainingBlockSheet";
import { ReadingLogSheet } from "@/components/dashboard/ReadingLogSheet";

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

const ANCHOR_TYPES = ["morning_routine", "strategy", "training", "reading", "evening_routine"];

const ANCHOR_CONFIG: Record<string, { label: string; icon: typeof Sun }> = {
  morning_routine: { label: "Morning Routine", icon: Sun },
  strategy: { label: "Strategy", icon: CalendarClock },
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

      // Check onboarding
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

      // Fetch blocks and streaks in parallel
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
          .eq("user_id", user.id),
      ]);

      if (blocksRes.data) setTodayBlocks(blocksRes.data);
      if (streaksRes.data) setStreaks(streaksRes.data);

      // Fetch completion data for anchors
      const completions: Record<string, boolean> = {};

      // Routine completions (morning, evening, strategy)
      const routineTypes = ["morning_routine", "evening_routine", "strategy"];
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

      // Training completion
      const { data: trainingData } = await supabase
        .from("user_training_schedule")
        .select("completed")
        .eq("user_id", user.id)
        .eq("day_of_week", today)
        .eq("completed", true)
        .limit(1);

      completions.training = (trainingData?.length ?? 0) > 0;

      // Reading completion
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

  const handleAnchorClick = (block: ScheduleBlock) => {
    switch (block.block_type) {
      case "morning_routine":
      case "evening_routine":
      case "strategy":
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
  // Deduplicate by block_type (keep first)
  const seenTypes = new Set<string>();
  const uniqueAnchors = anchorBlocks.filter((b) => {
    if (seenTypes.has(b.block_type)) return false;
    seenTypes.add(b.block_type);
    return true;
  });

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
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-muted-foreground">
            {format(currentTime, "EEEE, MMMM d")}
          </p>
        </motion.header>

        {/* Streaks */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3"
        >
          {streaks.map((streak) => (
            <div
              key={streak.streak_type}
              className="flex-1 card-stat flex items-center gap-2"
            >
              <Flame
                className={cn(
                  "h-4 w-4",
                  streak.current_streak > 0 ? "text-primary" : "text-muted-foreground"
                )}
              />
              <div>
                <span className="text-lg font-semibold">{streak.current_streak}</span>
                <span className="text-xs text-muted-foreground ml-1 capitalize">
                  {streak.streak_type}
                </span>
              </div>
            </div>
          ))}
        </motion.section>

        {/* Quick Actions */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <h2 className="text-sm font-medium text-muted-foreground">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const isMorning = new Date().getHours() < 12;
                setRoutineSheetType(isMorning ? "morning_routine" : "evening_routine");
                setRoutineSheetOpen(true);
              }}
            >
              {new Date().getHours() < 12 ? (
                <PenLine className="h-5 w-5 text-primary" />
              ) : (
                <Moon className="h-5 w-5 text-primary" />
              )}
              <span className="text-sm">
                {new Date().getHours() < 12 ? "Morning Journal" : "Evening Reflection"}
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => {
                const tb = todayBlocks.find(
                  (b) => b.block_type === "training" && b.training_day_id
                );
                if (tb?.training_day_id) {
                  navigate(`/workout/${tb.training_day_id}`);
                } else {
                  navigate("/training");
                }
              }}
            >
              <Dumbbell className="h-5 w-5 text-primary" />
              <span className="text-sm">Today's Training</span>
            </Button>
          </div>
        </motion.section>

        {/* Daily Habits */}
        {user && <DailyHabits userId={user.id} />}

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

        {/* Daily Quote */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card-ritual"
        >
          <p className="text-sm text-muted-foreground italic">
            "Discipline equals freedom."
          </p>
          <p className="text-xs text-muted-foreground mt-2">— Jocko Willink</p>
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
