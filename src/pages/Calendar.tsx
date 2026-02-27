import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Lock, Plus, Trash2, Home, HardHat } from "lucide-react";
import { ShiftConfigSheet } from "@/components/calendar/ShiftConfigSheet";
import { ShiftEntrySheet } from "@/components/calendar/ShiftEntrySheet";
import { rebuildDayAroundShift, addMinutesTime, type OnboardingDurations, type ShiftEntry } from "@/lib/shiftScheduleBuilder";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBlockDrag, type ScheduleBlock } from "@/hooks/useBlockDrag";
import { useBlockResize } from "@/hooks/useBlockResize";
import { DraggableBlock } from "@/components/calendar/DraggableBlock";
import { RoutineChecklistSheet } from "@/components/calendar/RoutineChecklistSheet";
import { TrainingBlockSheet } from "@/components/calendar/TrainingBlockSheet";
import { AddEventSheet } from "@/components/calendar/AddEventSheet";

const HOUR_HEIGHT = 48; // pixels per hour
const DEFAULT_START_HOUR = 0;
const END_HOUR = 24;

interface ScheduledWorkout {
  id: string;
  user_id: string;
  training_day_id: string;
  scheduled_date: string;
  status: string;
  workout_session_id: string | null;
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [overrides, setOverrides] = useState<Array<{
    block_id: string;
    original_day_of_week: number;
    override_day_of_week: number;
    week_start_date: string;
  }>>([]);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [routineSheetType, setRoutineSheetType] = useState<string>("morning_routine");

  // Training block sheet state
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [trainingBlock, setTrainingBlock] = useState<ScheduleBlock | null>(null);
  const [trainingBlockDate, setTrainingBlockDate] = useState<string>("");

  // Scheduled workouts for the current week
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);

  // Add event sheet state
  const [addEventSheetOpen, setAddEventSheetOpen] = useState(false);

  // FIFO schedule mode
  const [isFifoUser, setIsFifoUser] = useState(false);
  const [activeMode, setActiveMode] = useState<'home' | 'on_site'>('home');
  const [shiftConfigOpen, setShiftConfigOpen] = useState(false);
  const [fifoShiftLength, setFifoShiftLength] = useState(12);
  const [weekHasShiftConfig, setWeekHasShiftConfig] = useState(false);

  // Shift entry sheet state
  const [shiftEntryOpen, setShiftEntryOpen] = useState(false);
  const [isShiftWorker, setIsShiftWorker] = useState(false);
  const [onboardingCompletedAt, setOnboardingCompletedAt] = useState<string | null>(null);

  // Shift entries for date-specific schedule overrides
  const [shiftEntries, setShiftEntries] = useState<Map<string, ShiftEntry>>(new Map());

  // Onboarding durations for shift schedule rebuilding
  const [onboardingDurations, setOnboardingDurations] = useState<OnboardingDurations>({
    commuteMinutes: 30,
    gymCommuteMinutes: 15,
    workToGymMinutes: 15,
    sleepDuration: 8,
    bedtime: "22:00",
    weekendBedtime: "23:00",
  });

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    onBlockTouchStart,
    onBlockTouchMove,
    onBlockTouchEnd,
    onBlockMouseDown,
    getDragOffset,
    isDragging,
    isAnyDragging,
    wasJustDragged,
  } = useBlockDrag(blocks, setBlocks, user?.id);

  const {
    onResizeMouseDown,
    onResizeTouchStart,
    getResizePreview,
    isResizing,
    isAnyResizing,
    wasJustResized,
  } = useBlockResize(blocks, setBlocks, user?.id);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Detect FIFO/shift user and get shift length
  useEffect(() => {
    const checkWorkType = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("onboarding_data")
        .select("work_type, fifo_shift_length, commute_minutes, gym_commute_minutes, work_to_gym_minutes, sleep_duration, bedtime, weekend_bedtime, updated_at")
        .eq("user_id", user.id)
        .single();
      if (data?.updated_at) setOnboardingCompletedAt(data.updated_at);
      setIsFifoUser(data?.work_type === 'fifo');
      setIsShiftWorker(data?.work_type === 'shift_work' || data?.work_type === 'fifo');
      if (data?.fifo_shift_length) setFifoShiftLength(data.fifo_shift_length);
      setOnboardingDurations({
        commuteMinutes: data?.commute_minutes ?? 30,
        gymCommuteMinutes: data?.gym_commute_minutes ?? 15,
        workToGymMinutes: data?.work_to_gym_minutes ?? 15,
        sleepDuration: data?.sleep_duration ?? 8,
        bedtime: data?.bedtime ?? "22:00",
        weekendBedtime: data?.weekend_bedtime ?? "23:00",
      });
    };
    checkWorkType();
  }, [user]);

  // Fetch active mode + shift config for current week
  useEffect(() => {
    const fetchMode = async () => {
      if (!user || !isFifoUser) return;
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const { data } = await supabase
        .from("user_schedule_mode" as any)
        .select("active_mode, shift_type, shift_start, shift_end")
        .eq("user_id", user.id)
        .eq("week_start_date", weekStartStr)
        .single();
      if (data) {
        setActiveMode((data as any)?.active_mode || 'home');
        const shiftStart = (data as any)?.shift_start;
        setWeekHasShiftConfig(!!shiftStart && shiftStart.trim() !== '');
      } else {
        setActiveMode('home');
        setWeekHasShiftConfig(false);
      }
    };
    fetchMode();
  }, [user, isFifoUser, weekStart]);

  const toggleScheduleMode = useCallback(async (mode: 'home' | 'on_site') => {
    if (!user) return;
    if (mode === 'on_site' && !weekHasShiftConfig) {
      // Show shift config sheet first
      setShiftConfigOpen(true);
      return;
    }
    setActiveMode(mode);
    const weekStartStr = format(weekStart, "yyyy-MM-dd");
    await supabase
      .from("user_schedule_mode" as any)
      .upsert({
        user_id: user.id,
        week_start_date: weekStartStr,
        active_mode: mode,
      } as any, { onConflict: 'user_id,week_start_date' });
  }, [user, weekStart, weekHasShiftConfig]);

  const handleShiftConfigConfirm = useCallback(async (config: { shiftType: "days" | "nights"; shiftStart: string; shiftEnd: string }) => {
    if (!user) return;
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    // 1. Save shift config + set mode to on_site
    await supabase
      .from("user_schedule_mode" as any)
      .upsert({
        user_id: user.id,
        week_start_date: weekStartStr,
        active_mode: 'on_site',
        shift_type: config.shiftType,
        shift_start: config.shiftStart,
        shift_end: config.shiftEnd,
      } as any, { onConflict: 'user_id,week_start_date' });

    // 2. Fetch home training blocks to know which days have training
    const { data: homeTrainingBlocks } = await supabase
      .from("schedule_blocks")
      .select("day_of_week, training_day_id")
      .eq("user_id", user.id)
      .eq("schedule_mode", "home")
      .eq("block_type", "training");

    const trainingDayMap = new Map<number, string | null>();
    (homeTrainingBlocks || []).forEach((b: any) => {
      trainingDayMap.set(b.day_of_week, b.training_day_id);
    });

    // 3. Delete existing on_site blocks
    await supabase
      .from("schedule_blocks")
      .delete()
      .eq("user_id", user.id)
      .eq("schedule_mode", 'on_site');

    // 4. Regenerate on-site blocks based on config + home training days
    const allDays = [0, 1, 2, 3, 4, 5, 6];
    const newBlocks = generateOnSiteBlocksFromConfig(user.id, config, fifoShiftLength, allDays, trainingDayMap);

    if (newBlocks.length > 0) {
      await supabase.from("schedule_blocks").insert(newBlocks as any);
    }

    setActiveMode('on_site');
    setWeekHasShiftConfig(true);
    setShiftConfigOpen(false);

    // Re-fetch blocks
    const { data } = await supabase
      .from("schedule_blocks")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time");
    if (data) {
      setBlocks(data.filter((b: any) => (b as any).schedule_mode === 'on_site'));
    }
  }, [user, weekStart, fifoShiftLength]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time");

      if (data) {
        // Filter by schedule mode client-side for FIFO users
        if (isFifoUser) {
          setBlocks(data.filter((b: any) => (b as any).schedule_mode === activeMode));
        } else {
          setBlocks(data);
        }
      }
    };

    fetchBlocks();
  }, [user, isFifoUser, activeMode]);

  // Fetch shift entries for the current week
  useEffect(() => {
    const fetchShiftEntries = async () => {
      if (!user || !isShiftWorker) return;
      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
      let query = supabase
        .from("shift_entries")
        .select("*")
        .eq("user_id", user.id)
        .gte("shift_date", weekDates[0])
        .lte("shift_date", weekDates[6]);
      // Only use shift entries created after the latest onboarding completion
      if (onboardingCompletedAt) {
        query = query.gte("created_at", onboardingCompletedAt);
      }
      const { data } = await query;

      const map = new Map<string, { startTime: string; endTime: string; isOff: boolean }>();
      (data || []).forEach((entry: any) => {
        map.set(entry.shift_date, {
          startTime: entry.start_time?.slice(0, 5) || "06:00",
          endTime: entry.end_time?.slice(0, 5) || "18:00",
          isOff: entry.is_off,
        });
      });
      setShiftEntries(map);
    };
    fetchShiftEntries();
  }, [user, isShiftWorker, weekStart, onboardingCompletedAt]);

  // Fetch overrides for the current week
  useEffect(() => {
    const fetchOverrides = async () => {
      if (!user) return;
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const { data } = await supabase
        .from("schedule_block_overrides" as any)
        .select("block_id, original_day_of_week, override_day_of_week, week_start_date")
        .eq("user_id", user.id)
        .eq("week_start_date", weekStartStr);

      if (data) setOverrides(data as any);
      else setOverrides([]);
    };

    fetchOverrides();
  }, [user, weekStart]);

  // Generate and fetch scheduled_workouts for visible week
  useEffect(() => {
    const ensureScheduledWorkouts = async () => {
      if (!user) return;

      const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
      const weekEndDate = weekDates[6];
      const weekStartDate = weekDates[0];

      // Fetch existing scheduled workouts for this range
      const { data: existing } = await (supabase
        .from("scheduled_workouts" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", weekStartDate) as any)
        .lte("scheduled_date", weekEndDate);

      const existingMap = new Map<string, ScheduledWorkout>();
      (existing || []).forEach((sw: any) => {
        existingMap.set(`${sw.training_day_id}_${sw.scheduled_date}`, sw);
      });

      // Determine which training blocks need scheduled_workouts
      // Use effectiveBlocks (with overrides applied) to get the correct day mapping
      const trainingBlocks = blocks.filter((b) => b.block_type === "training" && b.training_day_id);

      // Apply overrides to get effective day mapping
      const weekStartStr = format(weekStart, "yyyy-MM-dd");
      const effectiveTrainingBlocks = trainingBlocks.map((b) => {
        const override = overrides.find((o) => o.block_id === b.id && o.week_start_date === weekStartStr);
        if (override) return { ...b, day_of_week: override.override_day_of_week };
        return b;
      });

      const toInsert: any[] = [];
      effectiveTrainingBlocks.forEach((block) => {
        const dayDate = weekDates[block.day_of_week]; // weekDays starts from Sunday (index 0)
        if (!dayDate) return;
        const key = `${block.training_day_id}_${dayDate}`;
        if (!existingMap.has(key)) {
          toInsert.push({
            user_id: user.id,
            training_day_id: block.training_day_id,
            scheduled_date: dayDate,
            status: "planned",
          });
        }
      });

      if (toInsert.length > 0) {
        await supabase.from("scheduled_workouts" as any).insert(toInsert);
      }

      // Re-fetch all for this week
      const { data: allSW } = await (supabase
        .from("scheduled_workouts" as any)
        .select("*")
        .eq("user_id", user.id)
        .gte("scheduled_date", weekStartDate) as any)
        .lte("scheduled_date", weekEndDate);

      setScheduledWorkouts((allSW || []) as ScheduledWorkout[]);
    };

    ensureScheduledWorkouts();
  }, [user, weekStart, blocks, overrides]);

  // Apply overrides to blocks for the current week view
  const effectiveBlocks = useMemo(() => {
    // Remove reading blocks globally (reading is folded into evening routine)
    let result = blocks.filter((b) => b.block_type !== "reading");
    
    // Apply day-of-week overrides
    if (overrides.length > 0) {
      result = result.map((b) => {
        const override = overrides.find((o) => o.block_id === b.id);
        if (override) {
          return { ...b, day_of_week: override.override_day_of_week };
        }
        return b;
      });
    }

    // Apply shift entries: rebuild entire day schedule around shift times
    if (shiftEntries.size > 0) {
      const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
      const shiftAdjusted: ScheduleBlock[] = [];

      // Group blocks by day_of_week
      const blocksByDay = new Map<number, ScheduleBlock[]>();
      result.forEach((block) => {
        const list = blocksByDay.get(block.day_of_week) || [];
        list.push(block);
        blocksByDay.set(block.day_of_week, list);
      });

      for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const date = weekDates[dayIdx];
        const dow = date.getDay();
        const dateStr = format(date, "yyyy-MM-dd");
        const shift = shiftEntries.get(dateStr);
        const dayBlocks = blocksByDay.get(dow) || [];

        // Look up adjacent day shifts for transition awareness
        const prevDateStr = format(addDays(date, -1), "yyyy-MM-dd");
        const nextDateStr = format(addDays(date, 1), "yyyy-MM-dd");
        const prevShift = shiftEntries.get(prevDateStr) || null;
        const nextShift = shiftEntries.get(nextDateStr) || null;

        if (!shift) {
          // No shift entry for this day — keep blocks as-is
          shiftAdjusted.push(...dayBlocks);
        } else {
          // Rebuild entire day around the shift with transition context
          const rebuilt = rebuildDayAroundShift(dayBlocks, shift, onboardingDurations, prevShift, nextShift);
          shiftAdjusted.push(...rebuilt);
        }
      }

      result = shiftAdjusted;
    }

    // Global: anchor evening routine to 1 hour before sleep on every day
    const sleepByDay = new Map<number, ScheduleBlock>();
    result.forEach((b) => {
      if (b.block_type === "sleep") sleepByDay.set(b.day_of_week, b);
    });
    result = result.map((b) => {
      if (b.block_type === "evening_routine") {
        const sleep = sleepByDay.get(b.day_of_week);
        if (sleep) {
          const eveningEnd = sleep.start_time;
          const [h, m] = eveningEnd.split(":").map(Number);
          const totalMin = ((h * 60 + m - 60) % 1440 + 1440) % 1440;
          const eveningStart = `${Math.floor(totalMin / 60).toString().padStart(2, "0")}:${(totalMin % 60).toString().padStart(2, "0")}`;
          return { ...b, start_time: eveningStart, end_time: eveningEnd };
        }
      }
      return b;
    });

    return result;
  }, [blocks, overrides, shiftEntries, weekStart, onboardingDurations]);

  // Compute dynamic start hour based on earliest block
  const startHourOfGrid = useMemo(() => {
    if (effectiveBlocks.length === 0) return DEFAULT_START_HOUR;
    let earliest = DEFAULT_START_HOUR;
    effectiveBlocks.forEach((b) => {
      if (b.block_type === "sleep") return;
      const [h] = b.start_time.split(":").map(Number);
      if (h < earliest) earliest = h;
    });
    return earliest;
  }, [effectiveBlocks]);

  const HOURS = useMemo(() => {
    const count = END_HOUR - startHourOfGrid;
    return Array.from({ length: count }, (_, i) => i + startHourOfGrid);
  }, [startHourOfGrid]);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));

  // Get scheduled workout status for a training block on a specific date
  const getScheduledWorkoutStatus = (trainingDayId: string, dateStr: string): string | null => {
    const sw = scheduledWorkouts.find(
      (s) => s.training_day_id === trainingDayId && s.scheduled_date === dateStr
    );
    return sw?.status || null;
  };

  const getBlockColor = (type: string, status?: string | null) => {
    if (type === "training") {
      switch (status) {
        case "completed":
          return "cal-block-training-done";
        case "in_progress":
          return "cal-block-training-active";
        default:
          return "cal-block-training";
      }
    }
    switch (type) {
      case "morning_routine":
        return "cal-block-morning";
      case "evening_routine":
        return "cal-block-evening";
      case "work":
        return "cal-block-work";
      case "reading":
        return "cal-block-reading";
      case "wake":
        return "cal-block-wake";
      case "sleep":
        return "cal-block-sleep";
      case "commute":
        return "cal-block-commute";
      case "custom":
        return "cal-block-custom";
      case "strategy":
        return "cal-block-strategy";
      case "roster_reminder":
        return "cal-block-roster";
      default:
        return "cal-block-default";
    }
  };

  const parseTime = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours + minutes / 60;
  };

  const getBlockStyle = (block: ScheduleBlock) => {
    const startHour = parseTime(block.start_time);
    const endHour = parseTime(block.end_time);

    let duration = endHour - startHour;
    if (duration <= 0) {
      // Crosses midnight — clip to end of day (show evening portion only)
      duration = END_HOUR - startHour;
    }

    if (startHour < startHourOfGrid || startHour >= END_HOUR) return null;

    const top = (startHour - startHourOfGrid) * HOUR_HEIGHT;
    const height = duration * HOUR_HEIGHT;

    return { top, height };
  };

  // For blocks that cross midnight, generate a morning portion (00:00 → end_time) on the next day
  const getOvernightMorningStyle = (block: ScheduleBlock) => {
    const startHour = parseTime(block.start_time);
    const endHour = parseTime(block.end_time);
    if (endHour >= startHour) return null; // doesn't cross midnight
    
    const morningDuration = endHour - startHourOfGrid;
    if (morningDuration <= 0) return null;

    return { top: 0, height: morningDuration * HOUR_HEIGHT };
  };

  const formatTimeShort = (time: string) => {
    const [hours] = time.split(":");
    const hour = parseInt(hours);
    return hour > 12 ? `${hour - 12}p` : `${hour}a`;
  };

  const handleDeleteCustomBlock = async (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
    setSelectedBlock(null);
    await supabase.from("schedule_blocks").delete().eq("id", blockId);
  };

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
        <div className="px-4 py-3 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-sm font-medium">
              {format(weekStart, "MMM d")} –{" "}
              {format(addDays(weekStart, 6), "MMM d")}
            </h2>
            <Button variant="ghost" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* FIFO Schedule Mode Toggle */}
        {isFifoUser && (
          <div className="px-4 py-2 border-b border-border/50 shrink-0">
            <div className="flex items-center justify-center gap-1 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => toggleScheduleMode('home')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeMode === 'home'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Home className="h-3.5 w-3.5" />
                Home
              </button>
              <button
                onClick={() => toggleScheduleMode('on_site')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  activeMode === 'on_site'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HardHat className="h-3.5 w-3.5" />
                On-Site
              </button>
            </div>
          </div>
        )}

        {/* Week Header */}
        <div className="flex border-b border-border/50 shrink-0">
          <div className="w-10 shrink-0" />
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex-1 py-2 text-center border-l border-border/30",
                  isToday && "bg-primary/10"
                )}
              >
                <span className="text-[10px] text-muted-foreground block">
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "text-sm font-semibold",
                    isToday && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekly Grid */}
        <div
          className="flex-1 overflow-auto"
          style={{ touchAction: isAnyDragging || isAnyResizing ? "none" : "auto" }}
        >
          <div className="flex min-h-full">
            {/* Time Column */}
            <div className="w-10 shrink-0 border-r border-border/30">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-12 flex items-start justify-end pr-1 pt-0.5"
                >
                  <span className="text-[10px] text-muted-foreground">
                    {hour > 12
                      ? `${hour - 12}p`
                      : hour === 12
                      ? "12p"
                      : `${hour}a`}
                  </span>
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day) => {
              const dayBlocks = effectiveBlocks.filter(
                (b) => b.day_of_week === day.getDay()
              );
              const isToday = isSameDay(day, new Date());
              const dayDateStr = format(day, "yyyy-MM-dd");

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex-1 relative border-l border-border/30",
                    isToday && "bg-primary/5"
                  )}
                >
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="h-12 border-b border-border/20"
                    />
                  ))}

                  {/* Morning continuation from previous day's overnight blocks (sleep, work) */}
                  {(() => {
                    const prevDayIndex = (day.getDay() + 6) % 7;
                    const overnightBlocks = effectiveBlocks.filter(
                      (b) => b.day_of_week === prevDayIndex && 
                             (b.block_type === "sleep" || b.block_type === "work") &&
                             parseTime(b.end_time) < parseTime(b.start_time) // crosses midnight
                    );
                    return overnightBlocks.map((block) => {
                      const morningStyle = getOvernightMorningStyle(block);
                      if (!morningStyle) return null;
                      return (
                        <div
                          key={`overnight-${block.id}`}
                          className={cn(
                            "absolute left-0.5 right-0.5 rounded-[2px] border-l-2 px-1 overflow-hidden pointer-events-none opacity-70",
                            getBlockColor(block.block_type)
                          )}
                          style={{ top: morningStyle.top, height: morningStyle.height, zIndex: 1 }}
                        >
                          <span className="text-[8px] font-medium truncate block mt-0.5">
                            {block.title}
                          </span>
                        </div>
                      );
                    });
                  })()}

                  {/* Schedule blocks */}
                  {dayBlocks.map((block) => {
                    const style = getBlockStyle(block);
                    if (!style) return null;
                    

                      const isWorkBlock = block.block_type === "work";
                      const workoutStatus = block.block_type === "training" && block.training_day_id
                        ? getScheduledWorkoutStatus(block.training_day_id, dayDateStr)
                        : null;

                      return (
                        <DraggableBlock
                          key={block.id}
                          block={block}
                          style={style}
                          colorClass={getBlockColor(block.block_type, workoutStatus)}
                          isDragging={isDragging(block.id)}
                          dragOffset={getDragOffset(block.id)}
                          isResizing={isResizing(block.id)}
                          resizePreview={getResizePreview(block.id)}
                          resizable={isWorkBlock}
                          onTouchStart={(e) => onBlockTouchStart(block.id, e)}
                          onTouchMove={onBlockTouchMove}
                          onTouchEnd={onBlockTouchEnd}
                          onMouseDown={(e) => onBlockMouseDown(block.id, e)}
                          onResizeMouseDown={
                            isWorkBlock
                              ? (edge, e) => onResizeMouseDown(block.id, edge, e)
                              : undefined
                          }
                          onResizeTouchStart={
                            isWorkBlock
                              ? (edge, e) => onResizeTouchStart(block.id, edge, e)
                              : undefined
                          }
                          onClick={() => {
                            if (wasJustDragged() || wasJustResized()) return;
                            if (
                              block.block_type === "training" &&
                              block.training_day_id
                            ) {
                              setTrainingBlock(block);
                              setTrainingBlockDate(dayDateStr);
                              setTrainingSheetOpen(true);
                             } else if (
                              block.block_type === "morning_routine" ||
                              block.block_type === "evening_routine" ||
                              block.block_type === "strategy"
                            ) {
                              setRoutineSheetType(block.block_type);
                              setRoutineSheetOpen(true);
                            } else if (block.block_type === "roster_reminder") {
                              setShiftEntryOpen(true);
                            } else {
                              setSelectedBlock(block);
                            }
                          }}
                        />
                      );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Block Detail Modal */}
        {selectedBlock && !isAnyDragging && !isAnyResizing && (
          <div className="absolute bottom-20 left-4 right-4 p-4 bg-card border border-border rounded-lg shadow-xl z-20 animate-fade-in">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  {selectedBlock.title}
                  {selectedBlock.is_locked && (
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  )}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {formatTimeShort(selectedBlock.start_time)} –{" "}
                  {formatTimeShort(selectedBlock.end_time)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedBlock(null)}
              >
                ✕
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded capitalize",
                    selectedBlock.block_type === "training"
                      ? "bg-primary/20 text-primary"
                      : selectedBlock.block_type === "custom"
                      ? "bg-teal-500/20 text-teal-300"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {selectedBlock.block_type === "strategy" ? "Planning Ritual" : selectedBlock.block_type.replace("_", " ")}
                </span>
                {selectedBlock.is_locked && (
                  <span className="text-xs text-muted-foreground">
                    Non-negotiable
                  </span>
                )}
              </div>
              {selectedBlock.block_type === "custom" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteCustomBlock(selectedBlock.id)}
                  className="text-destructive hover:text-destructive h-8 px-2"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-4 py-3 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-x-3 gap-y-1.5 text-[10px] text-muted-foreground flex-wrap">
            {[
              { cls: "cal-block-training", label: "Training" },
              { cls: "cal-block-training-done", label: "Done" },
              { cls: "cal-block-morning", label: "Morning" },
              { cls: "cal-block-evening", label: "Evening" },
              { cls: "cal-block-work", label: "Work" },
              { cls: "cal-block-sleep", label: "Sleep" },
              { cls: "cal-block-commute", label: "Commute" },
              { cls: "cal-block-reading", label: "Reading" },
              { cls: "cal-block-wake", label: "Wake" },
              { cls: "cal-block-strategy", label: "Planning" },
              { cls: "cal-block-custom", label: "Custom" },
            ].map((item) => (
              <div key={item.cls} className="flex items-center gap-1">
                <div className={cn("w-2.5 h-2.5 rounded-sm border-l-2", item.cls)} />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAB - Enter Shifts (shift/FIFO workers only) */}
      {(isShiftWorker || isFifoUser) && (
        <button
          onClick={() => setShiftEntryOpen(true)}
          className="fixed bottom-40 right-4 z-30 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/80 active:scale-95 transition-all border border-border"
          aria-label="Enter shifts"
        >
          <Clock className="h-5 w-5" />
        </button>
      )}

      {/* FAB - Add Event */}
      <button
        onClick={() => setAddEventSheetOpen(true)}
        className="fixed bottom-24 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
        aria-label="Add event"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Routine Checklist Sheet */}
      {user && (
        <RoutineChecklistSheet
          open={routineSheetOpen}
          onOpenChange={setRoutineSheetOpen}
          userId={user.id}
          routineType={routineSheetType}
        />
      )}

      {/* Training Block Sheet */}
      {user && (
        <TrainingBlockSheet
          open={trainingSheetOpen}
          onOpenChange={(open) => {
            setTrainingSheetOpen(open);
            if (!open) {
              // Refetch scheduled workouts to update status
              const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
              (supabase
                .from("scheduled_workouts" as any)
                .select("*")
                .eq("user_id", user.id)
                .gte("scheduled_date", weekDates[0]) as any)
                .lte("scheduled_date", weekDates[6])
                .then(({ data }: any) => {
                  if (data) setScheduledWorkouts(data);
                });
            }
          }}
          block={trainingBlock}
          blocks={effectiveBlocks}
          userId={user.id}
          selectedDate={trainingBlockDate}
          weekStart={weekStart}
          onRescheduleComplete={(updatedBlocks) => {
            setBlocks(updatedBlocks);
            setTrainingBlock(null);
          }}
          onOverrideAdded={() => {
            // Refetch overrides
            const weekStartStr = format(weekStart, "yyyy-MM-dd");
            supabase
              .from("schedule_block_overrides" as any)
              .select("block_id, original_day_of_week, override_day_of_week, week_start_date")
              .eq("user_id", user.id)
              .eq("week_start_date", weekStartStr)
              .then(({ data }) => {
                if (data) setOverrides(data as any);
              });
          }}
        />
      )}

      {/* Add Event Sheet */}
      {user && (
        <AddEventSheet
          open={addEventSheetOpen}
          onOpenChange={setAddEventSheetOpen}
          blocks={blocks}
          userId={user.id}
          onEventAdded={(newBlocks) => {
            const arr = Array.isArray(newBlocks) ? newBlocks : [newBlocks];
            setBlocks((prev) => [...prev, ...arr]);
          }}
        />
      )}

      {/* Shift Config Sheet */}
      <ShiftConfigSheet
        open={shiftConfigOpen}
        onOpenChange={setShiftConfigOpen}
        shiftLength={fifoShiftLength}
        onConfirm={handleShiftConfigConfirm}
      />

      {/* Shift Entry Sheet */}
      {user && (
        <ShiftEntrySheet
          open={shiftEntryOpen}
          onOpenChange={setShiftEntryOpen}
          userId={user.id}
          onSaved={() => {
            // Refetch shift entries for the current week
            const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));
            supabase
              .from("shift_entries")
              .select("*")
              .eq("user_id", user.id)
              .gte("shift_date", weekDates[0])
              .lte("shift_date", weekDates[6])
              .then(({ data }) => {
                const map = new Map<string, { startTime: string; endTime: string; isOff: boolean }>();
                (data || []).forEach((entry: any) => {
                  map.set(entry.shift_date, {
                    startTime: entry.start_time?.slice(0, 5) || "06:00",
                    endTime: entry.end_time?.slice(0, 5) || "18:00",
                    isOff: entry.is_off,
                  });
                });
                setShiftEntries(map);
              });
          }}
        />
      )}
    </MobileLayout>
  );
}




function generateOnSiteBlocksFromConfig(
  userId: string,
  config: { shiftType: "days" | "nights"; shiftStart: string; shiftEnd: string },
  shiftLength: number,
  allDays: number[],
  trainingDayMap: Map<number, string | null>
): any[] {
  const blocks: any[] = [];
  const shortRoutine = 20;
  const trainingDuration = 45;
  const hasTraining = (day: number) => trainingDayMap.has(day);
  const getTrainingDayId = (day: number) => trainingDayMap.get(day) || null;

  allDays.forEach((day) => {
    if (config.shiftType === "days") {
      const wakeTime = addMinutesTime(config.shiftStart, -60);
      const bedtime = addMinutesTime(config.shiftEnd, 180);
      const cappedBedtime = bedtime > "23:00" ? "22:00" : bedtime;

      blocks.push({ user_id: userId, block_type: 'morning_routine', title: 'Morning Routine', start_time: wakeTime, end_time: addMinutesTime(wakeTime, shortRoutine), day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
      blocks.push({ user_id: userId, block_type: 'work', title: 'Site Shift', start_time: config.shiftStart, end_time: config.shiftEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });

      // Training after shift — only on scheduled training days
      if (hasTraining(day)) {
        const trainingStart = addMinutesTime(config.shiftEnd, 30);
        const trainingEnd = addMinutesTime(trainingStart, trainingDuration);
        if (trainingEnd <= "20:30") {
          blocks.push({ user_id: userId, block_type: 'training', title: 'On-Site Training', start_time: trainingStart, end_time: trainingEnd, day_of_week: day, is_locked: false, schedule_mode: 'on_site', training_day_id: getTrainingDayId(day) });
        }
      }

      blocks.push({ user_id: userId, block_type: 'evening_routine', title: 'Evening Routine', start_time: addMinutesTime(cappedBedtime, -shortRoutine), end_time: cappedBedtime, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
      blocks.push({ user_id: userId, block_type: 'sleep', title: 'Sleep', start_time: cappedBedtime, end_time: wakeTime, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
    } else {
      // Night shift
      const wakeTime = addMinutesTime(config.shiftStart, -120);
      const sleepEnd = addMinutesTime(wakeTime, 0);
      const sleepStart = addMinutesTime(config.shiftEnd, 60);

      blocks.push({ user_id: userId, block_type: 'sleep', title: 'Sleep', start_time: sleepStart, end_time: sleepEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
      blocks.push({ user_id: userId, block_type: 'morning_routine', title: 'Afternoon Routine', start_time: wakeTime, end_time: addMinutesTime(wakeTime, shortRoutine), day_of_week: day, is_locked: true, schedule_mode: 'on_site' });

      // Training before shift — only on scheduled training days
      if (hasTraining(day)) {
        const trainingStart = addMinutesTime(wakeTime, shortRoutine + 15);
        const trainingEnd = addMinutesTime(trainingStart, trainingDuration);
        const latestTraining = addMinutesTime(config.shiftStart, -30);
        if (trainingEnd <= latestTraining) {
          blocks.push({ user_id: userId, block_type: 'training', title: 'On-Site Training', start_time: trainingStart, end_time: trainingEnd, day_of_week: day, is_locked: false, schedule_mode: 'on_site', training_day_id: getTrainingDayId(day) });
        }
      }

      blocks.push({ user_id: userId, block_type: 'work', title: 'Night Shift', start_time: config.shiftStart, end_time: config.shiftEnd, day_of_week: day, is_locked: true, schedule_mode: 'on_site' });
    }
  });

  return blocks;
}
