import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
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

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!user) return;

      const dayOfWeek = selectedDate.getDay();
      const { data } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", user.id)
        .eq("day_of_week", dayOfWeek)
        .order("start_time");

      if (data) setBlocks(data);
    };

    fetchBlocks();
  }, [user, selectedDate]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => {
    setWeekStart(addDays(weekStart, -7));
  };

  const goToNextWeek = () => {
    setWeekStart(addDays(weekStart, 7));
  };

  const getBlockColor = (type: string) => {
    switch (type) {
      case "training":
        return "bg-primary/20 border-l-primary";
      case "morning_routine":
      case "evening_routine":
        return "bg-secondary border-l-secondary-foreground/50";
      case "work":
        return "bg-muted border-l-muted-foreground/30";
      case "reading":
        return "bg-info/10 border-l-info";
      case "sleep":
        return "bg-info/5 border-l-info/50";
      default:
        return "bg-accent border-l-accent-foreground/30";
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Filter out sleep blocks for cleaner view
  const visibleBlocks = blocks.filter((b) => b.block_type !== "sleep");

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="flex flex-col h-full">
        {/* Week Navigation */}
        <div className="px-6 py-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-medium">
              {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {/* Week Days */}
          <div className="flex justify-between">
            {weekDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg transition-all duration-200 min-w-[40px]",
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="text-xs">{format(day, "EEE")}</span>
                  <span className="text-lg font-semibold">{format(day, "d")}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Blocks */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <div className="space-y-2">
            {visibleBlocks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No scheduled blocks for this day.</p>
              </div>
            ) : (
              visibleBlocks.map((block, index) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "p-4 rounded-lg border-l-2 transition-all duration-200",
                    getBlockColor(block.block_type)
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{block.title}</h3>
                        {block.is_locked && (
                          <Lock className="h-3 w-3 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatTime(block.start_time)} – {formatTime(block.end_time)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs px-2 py-1 rounded capitalize",
                        block.block_type === "training"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {block.block_type.replace("_", " ")}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-6 py-4 border-t border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>Locked blocks cannot be deleted. They're your non-negotiables.</span>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
