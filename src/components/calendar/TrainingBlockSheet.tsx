import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Dumbbell, CalendarClock, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ScheduleBlock } from "@/hooks/useBlockDrag";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TrainingBlockSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: ScheduleBlock | null;
  blocks: ScheduleBlock[];
  userId: string;
  selectedDate?: string;
  weekStart?: Date;
  onRescheduleComplete: (updatedBlocks: ScheduleBlock[]) => void;
  onOverrideAdded?: () => void;
}

function formatTimeShort(time: string) {
  const [hours] = time.split(":");
  const hour = parseInt(hours);
  return hour > 12 ? `${hour - 12}:${time.split(":")[1]} PM` : `${hour}:${time.split(":")[1]} AM`;
}

export function TrainingBlockSheet({
  open,
  onOpenChange,
  block,
  blocks,
  userId,
  selectedDate,
  weekStart,
  onRescheduleComplete,
  onOverrideAdded,
}: TrainingBlockSheetProps) {
  const navigate = useNavigate();
  const [view, setView] = useState<"details" | "reschedule">("details");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [rescheduleType, setRescheduleType] = useState<"this_week" | "permanent">("this_week");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!block) return null;

  const trainingBlocks = blocks.filter((b) => b.block_type === "training");
  const trainingDays = new Set(trainingBlocks.map((b) => b.day_of_week));

  const handleStartWorkout = () => {
    if (block.training_day_id) {
      onOpenChange(false);
      const dateParam = selectedDate || new Date().toISOString().split("T")[0];
      navigate(`/workout/${block.training_day_id}?date=${dateParam}`);
    }
  };

  const handleOpenReschedule = () => {
    setView("reschedule");
    setSelectedDay(null);
    setRescheduleType("this_week");
    setError(null);
  };

  const handleBack = () => {
    setView("details");
    setSelectedDay(null);
    setError(null);
  };

  const handleConfirmReschedule = async () => {
    if (selectedDay === null || selectedDay === block.day_of_week) return;

    setSaving(true);
    setError(null);

    try {
      // Find linked commute blocks on the same day
      const linkedCommutes = blocks.filter(
        (b) =>
          b.block_type === "commute" &&
          b.day_of_week === block.day_of_week &&
          (b.end_time === block.start_time || b.start_time === block.end_time)
      );

      const linkedIds = [block.id, ...linkedCommutes.map((c) => c.id)];
      const movedBlocks = [block, ...linkedCommutes];

      // Check for time overlaps on the target day
      const targetDayBlocks = blocks.filter(
        (b) => b.day_of_week === selectedDay && b.block_type !== "sleep"
      );

      const hasOverlap = movedBlocks.some((moved) => {
        const mStart = parseTimeToMinutes(moved.start_time);
        const mEnd = parseTimeToMinutes(moved.end_time);
        return targetDayBlocks.some((other) => {
          const oStart = parseTimeToMinutes(other.start_time);
          const oEnd = parseTimeToMinutes(other.end_time);
          return mStart < oEnd && mEnd > oStart;
        });
      });

      if (hasOverlap) {
        setError("Time conflict on that day. Move existing blocks first.");
        setSaving(false);
        return;
      }

      if (rescheduleType === "this_week" && weekStart) {
        // One-time override: insert into schedule_block_overrides
        const weekStartStr = format(weekStart, "yyyy-MM-dd");

        const overrideInserts = linkedIds.map((id) => {
          const originalBlock = blocks.find((b) => b.id === id);
          return supabase.from("schedule_block_overrides" as any).upsert({
            block_id: id,
            user_id: userId,
            original_day_of_week: originalBlock?.day_of_week ?? block.day_of_week,
            override_day_of_week: selectedDay,
            week_start_date: weekStartStr,
          } as any, { onConflict: "block_id,week_start_date" });
        });

        await Promise.all(overrideInserts);
        onOverrideAdded?.();
      } else {
        // Permanent change: update schedule_blocks directly
        const blockUpdates = linkedIds.map((id) =>
          supabase
            .from("schedule_blocks")
            .update({ day_of_week: selectedDay })
            .eq("id", id)
        );

        // Update user_training_schedule
        const scheduleUpdate = block.training_day_id
          ? supabase
              .from("user_training_schedule")
              .update({ day_of_week: selectedDay })
              .eq("user_id", userId)
              .eq("training_day_id", block.training_day_id)
          : null;

        await Promise.all([...blockUpdates, ...(scheduleUpdate ? [scheduleUpdate] : [])]);

        // Update local state
        const updatedBlocks = blocks.map((b) =>
          linkedIds.includes(b.id) ? { ...b, day_of_week: selectedDay } : b
        );

        onRescheduleComplete(updatedBlocks);
      }

      onOpenChange(false);
      setView("details");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setView("details");
      setSelectedDay(null);
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4">
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <AnimatePresence mode="wait">
          {view === "details" ? (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <SheetHeader className="text-left mb-5">
                <SheetTitle className="text-lg font-semibold flex items-center gap-2">
                  <Dumbbell className="h-5 w-5 text-primary" />
                  {block.title}
                </SheetTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {DAY_LABELS[block.day_of_week]} · {formatTimeShort(block.start_time)} – {formatTimeShort(block.end_time)}
                </p>
              </SheetHeader>

              <div className="space-y-3">
                <Button
                  onClick={handleStartWorkout}
                  className="w-full h-12 text-base font-semibold"
                >
                  <Dumbbell className="h-5 w-5 mr-2" />
                  Start Workout
                </Button>

                <Button
                  variant="outline"
                  onClick={handleOpenReschedule}
                  className="w-full h-11"
                >
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="reschedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <SheetHeader className="text-left mb-5">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <SheetTitle className="text-lg font-semibold">
                    Move to which day?
                  </SheetTitle>
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-10">
                  {block.title}
                </p>
              </SheetHeader>

              {/* Day picker */}
              <div className="grid grid-cols-7 gap-2 mb-5">
                {DAY_LABELS.map((label, dayIndex) => {
                  const isCurrentDay = dayIndex === block.day_of_week;
                  const hasTraining = trainingDays.has(dayIndex) && !isCurrentDay;
                  const isSelected = selectedDay === dayIndex;

                  return (
                    <button
                      key={dayIndex}
                      onClick={() => {
                        if (!isCurrentDay) {
                          setSelectedDay(dayIndex);
                          setError(null);
                        }
                      }}
                      disabled={isCurrentDay}
                      className={cn(
                        "flex flex-col items-center py-3 rounded-xl text-sm font-medium transition-all border",
                        isCurrentDay && "bg-muted/50 border-border text-muted-foreground opacity-50",
                        isSelected && "bg-primary border-primary text-primary-foreground",
                        !isCurrentDay && !isSelected && "bg-card border-border hover:border-primary/50",
                      )}
                    >
                      <span className="text-xs">{label}</span>
                      {hasTraining && !isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/60 mt-1" />
                      )}
                      {isCurrentDay && (
                        <span className="text-[9px] text-muted-foreground mt-0.5">current</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Reschedule type choice */}
              {selectedDay !== null && selectedDay !== block.day_of_week && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 space-y-2"
                >
                  <button
                    onClick={() => setRescheduleType("this_week")}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      rescheduleType === "this_week"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        rescheduleType === "this_week" ? "border-primary" : "border-muted-foreground/40"
                      )}
                    >
                      {rescheduleType === "this_week" && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">This week only</p>
                      <p className="text-xs text-muted-foreground">One-time change, reverts next week</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setRescheduleType("permanent")}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      rescheduleType === "permanent"
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0",
                        rescheduleType === "permanent" ? "border-primary" : "border-muted-foreground/40"
                      )}
                    >
                      {rescheduleType === "permanent" && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Change my schedule</p>
                      <p className="text-xs text-muted-foreground">Move permanently to {DAY_LABELS[selectedDay]}</p>
                    </div>
                  </button>
                </motion.div>
              )}

              {/* Conflict warning */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-sm text-destructive mb-4 px-1"
                >
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </motion.div>
              )}

              <Button
                onClick={handleConfirmReschedule}
                disabled={selectedDay === null || selectedDay === block.day_of_week || saving}
                className="w-full h-12 text-base font-semibold"
              >
                {saving ? (
                  <span className="animate-pulse">Moving...</span>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Confirm Reschedule
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
