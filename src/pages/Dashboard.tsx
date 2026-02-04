import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isToday } from "date-fns";
import { Sun, Moon, Dumbbell, BookOpen, PenLine, ChevronRight, Flame } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScheduleBlock {
  id: string;
  block_type: string;
  title: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  is_locked: boolean;
}

interface Streak {
  streak_type: string;
  current_streak: number;
}

export default function DashboardPage() {
  const [todayBlocks, setTodayBlocks] = useState<ScheduleBlock[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState("");
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // Update greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    // Update time every minute
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      // Check if onboarding is completed
      const { data: onboardingData } = await supabase
        .from("onboarding_data")
        .select("onboarding_completed")
        .eq("user_id", user.id)
        .single();

      if (!onboardingData?.onboarding_completed) {
        navigate("/onboarding");
        return;
      }

      // Fetch today's schedule
      const today = new Date().getDay();
      const { data: blocks } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_of_week", today)
        .order("start_time");

      if (blocks) setTodayBlocks(blocks);

      // Fetch streaks
      const { data: streakData } = await supabase
        .from("streaks")
        .select("streak_type, current_streak")
        .eq("user_id", user.id);

      if (streakData) setStreaks(streakData);
    };

    fetchData();
  }, [user, navigate]);

  const getBlockIcon = (type: string) => {
    switch (type) {
      case "morning_routine":
        return Sun;
      case "evening_routine":
        return Moon;
      case "training":
        return Dumbbell;
      case "reading":
        return BookOpen;
      default:
        return null;
    }
  };

  const getBlockClass = (type: string) => {
    switch (type) {
      case "training":
        return "time-block-training";
      case "morning_routine":
      case "evening_routine":
        return "time-block-routine";
      case "work":
        return "time-block-work";
      case "sleep":
        return "time-block-sleep";
      default:
        return "time-block-routine";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter visible blocks (hide sleep and wake for cleaner view)
  const visibleBlocks = todayBlocks.filter(
    (b) => !["sleep", "wake"].includes(b.block_type)
  );

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
              onClick={() => navigate("/journal")}
            >
              <PenLine className="h-5 w-5 text-primary" />
              <span className="text-sm">Morning Journal</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => navigate("/calendar")}
            >
              <Dumbbell className="h-5 w-5 text-primary" />
              <span className="text-sm">Today's Training</span>
            </Button>
          </div>
        </motion.section>

        {/* Today's Schedule */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">Today's Schedule</h2>
            <button
              onClick={() => navigate("/calendar")}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          
          <div className="space-y-2">
            {visibleBlocks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No scheduled blocks for today.
              </p>
            ) : (
              visibleBlocks.map((block, index) => {
                const Icon = getBlockIcon(block.block_type);
                return (
                  <motion.div
                    key={block.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className={cn("time-block", getBlockClass(block.block_type))}
                  >
                    <div className="flex items-center gap-3">
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{block.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(block.start_time)} – {formatTime(block.end_time)}
                        </p>
                      </div>
                    </div>
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
    </MobileLayout>
  );
}
