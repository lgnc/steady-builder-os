import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Lock, Plus, Trash2 } from "lucide-react";
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

  useEffect(() => {
    const fetchBlocks = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("schedule_blocks")
        .select("*")
        .eq("user_id", user.id)
        .order("start_time");

      if (data) setBlocks(data);
    };

    fetchBlocks();
  }, [user]);

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
    if (overrides.length === 0) return blocks;
    return blocks.map((b) => {
      const override = overrides.find((o) => o.block_id === b.id);
      if (override) {
        return { ...b, day_of_week: override.override_day_of_week };
      }
      return b;
    });
  }, [blocks, overrides]);

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
    const height = Math.max(duration * HOUR_HEIGHT, HOUR_HEIGHT / 4);

    return { top, height };
  };

  // For sleep blocks that cross midnight, generate a morning portion (00:00 → wake)
  const getSleepMorningStyle = (block: ScheduleBlock) => {
    if (block.block_type !== "sleep") return null;
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

                  {/* Morning sleep portion from previous day's sleep block */}
                  {(() => {
                    const prevDayIndex = (day.getDay() + 6) % 7; // previous day
                    const prevDaySleep = effectiveBlocks.find(
                      (b) => b.day_of_week === prevDayIndex && b.block_type === "sleep"
                    );
                    if (!prevDaySleep) return null;
                    const morningStyle = getSleepMorningStyle(prevDaySleep);
                    if (!morningStyle) return null;
                    return (
                      <div
                        className={cn(
                          "absolute left-0.5 right-0.5 rounded-md border-l-2 px-1 overflow-hidden pointer-events-none opacity-70",
                          getBlockColor("sleep")
                        )}
                        style={{ top: morningStyle.top, height: morningStyle.height, zIndex: 1 }}
                      >
                        <span className="text-[8px] font-medium truncate block mt-0.5">Sleep</span>
                      </div>
                    );
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
    </MobileLayout>
  );
}
