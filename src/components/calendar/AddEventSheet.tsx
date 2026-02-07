import { useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ScheduleBlock } from "@/hooks/useBlockDrag";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Generate time options in 15-minute increments from 5:00 AM to 11:00 PM
function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 5; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
      );
    }
  }
  options.push("23:00");
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTimeLabel(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr);
  const suffix = h >= 12 ? "PM" : "AM";
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${mStr} ${suffix}`;
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

interface AddEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocks: ScheduleBlock[];
  userId: string;
  onEventAdded: (newBlock: ScheduleBlock) => void;
}

export function AddEventSheet({
  open,
  onOpenChange,
  blocks,
  userId,
  onEventAdded,
}: AddEventSheetProps) {
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(new Date().getDay());
  const [startTime, setStartTime] = useState("12:00");
  const [endTime, setEndTime] = useState("13:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setTitle("");
    setDayOfWeek(new Date().getDay());
    setStartTime("12:00");
    setEndTime("13:00");
    setError(null);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Give your event a name.");
      return;
    }

    const startMin = parseTimeToMinutes(startTime);
    const endMin = parseTimeToMinutes(endTime);

    if (endMin <= startMin) {
      setError("End time must be after start time.");
      return;
    }

    // Overlap check
    const dayBlocks = blocks.filter(
      (b) => b.day_of_week === dayOfWeek && b.block_type !== "sleep"
    );

    const hasOverlap = dayBlocks.some((b) => {
      const oStart = parseTimeToMinutes(b.start_time);
      const oEnd = parseTimeToMinutes(b.end_time);
      return startMin < oEnd && endMin > oStart;
    });

    if (hasOverlap) {
      setError("Overlaps with an existing block. Adjust the time.");
      return;
    }

    setSaving(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("schedule_blocks")
      .insert({
        user_id: userId,
        block_type: "custom",
        title: trimmedTitle,
        start_time: startTime,
        end_time: endTime,
        day_of_week: dayOfWeek,
        is_locked: false,
      })
      .select()
      .single();

    setSaving(false);

    if (dbError || !data) {
      setError("Failed to save. Try again.");
      return;
    }

    onEventAdded(data as unknown as ScheduleBlock);
    handleOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4 max-h-[85vh] overflow-auto">
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="text-left mb-5">
          <SheetTitle className="text-lg font-semibold">Add Event</SheetTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Block time for social events, meetings, or anything else.
          </p>
        </SheetHeader>

        <div className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm font-medium">
              Event name
            </Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError(null);
              }}
              placeholder="e.g. Dinner with friends"
              className="h-11 bg-input border-border"
              autoFocus
            />
          </div>

          {/* Day picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Day</Label>
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map((label, dayIndex) => (
                <button
                  key={dayIndex}
                  onClick={() => {
                    setDayOfWeek(dayIndex);
                    setError(null);
                  }}
                  className={cn(
                    "py-2.5 rounded-xl text-sm font-medium transition-all border",
                    dayIndex === dayOfWeek
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-card border-border hover:border-primary/50"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Time selectors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Start</Label>
              <select
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  setError(null);
                }}
                className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeLabel(t)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">End</Label>
              <select
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value);
                  setError(null);
                }}
                className="w-full h-11 rounded-lg border border-border bg-input px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {formatTimeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive px-1"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 text-base font-semibold"
          >
            {saving ? (
              <span className="animate-pulse">Saving...</span>
            ) : (
              "Add to Calendar"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
