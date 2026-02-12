import { useState, useEffect } from "react";
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

// Time slots from 5 AM to 11 PM
const HOURS = Array.from({ length: 19 }, (_, i) => i + 5);
const HOUR_HEIGHT = 48; // pixels per hour

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<ScheduleBlock | null>(null);
  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [routineSheetType, setRoutineSheetType] = useState<string>("morning_routine");

  // Training block sheet state
  const [trainingSheetOpen, setTrainingSheetOpen] = useState(false);
  const [trainingBlock, setTrainingBlock] = useState<ScheduleBlock | null>(null);

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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setWeekStart(addDays(weekStart, -7));
  const goToNextWeek = () => setWeekStart(addDays(weekStart, 7));

  const getBlockColor = (type: string) => {
    switch (type) {
      case "training":
        return "bg-primary/80 border-primary text-primary-foreground";
      case "morning_routine":
        return "bg-emerald-500/20 border-emerald-500/50 text-emerald-300";
      case "evening_routine":
        return "bg-violet-500/20 border-violet-500/50 text-violet-300";
      case "work":
        return "bg-muted/80 border-border text-muted-foreground";
      case "reading":
        return "bg-sky-500/20 border-sky-500/50 text-sky-300";
      case "wake":
        return "bg-amber-500/20 border-amber-500/50 text-amber-300";
      case "sleep":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-300";
      case "commute":
        return "bg-orange-500/15 border-orange-500/40 text-orange-300";
      case "custom":
        return "bg-teal-500/20 border-teal-500/50 text-teal-300";
      case "strategy":
        return "bg-amber-500/20 border-amber-500/50 text-amber-300";
      default:
        return "bg-accent/50 border-accent text-accent-foreground";
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
      duration = 24 - startHour;
    }

    if (startHour < 5 || startHour >= 23) return null;

    const top = (startHour - 5) * HOUR_HEIGHT;
    const height = duration * HOUR_HEIGHT;

    return { top, height };
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
              const dayBlocks = blocks.filter(
                (b) => b.day_of_week === day.getDay()
              );
              const isToday = isSameDay(day, new Date());

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

                  {/* Schedule blocks */}
                  {dayBlocks.map((block) => {
                    const style = getBlockStyle(block);
                    if (!style) return null;
                    if (block.block_type === "sleep") return null;

                      const isWorkBlock = block.block_type === "work";

                      return (
                        <DraggableBlock
                          key={block.id}
                          block={block}
                          style={style}
                          colorClass={getBlockColor(block.block_type)}
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
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
            <Lock className="h-3 w-3" />
            <span>= Locked</span>
            <span className="mx-2">•</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-primary/80" />
              <span>Training</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-emerald-500/40" />
              <span>Morning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-violet-500/40" />
              <span>Evening</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-teal-500/40" />
              <span>Custom</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-amber-500/40" />
              <span>Planning</span>
            </div>
            <span className="mx-2">•</span>
            <span>Long press to drag</span>
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
          onOpenChange={setTrainingSheetOpen}
          block={trainingBlock}
          blocks={blocks}
          userId={user.id}
          onRescheduleComplete={(updatedBlocks) => {
            setBlocks(updatedBlocks);
            setTrainingBlock(null);
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
