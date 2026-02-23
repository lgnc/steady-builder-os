import { useState, useEffect, useMemo } from "react";
import { format, addDays, startOfWeek, addWeeks } from "date-fns";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ShiftDay {
  date: string; // yyyy-MM-dd
  dayOfWeek: number;
  isOff: boolean;
  startTime: string;
  endTime: string;
}

interface ShiftEntrySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSaved?: () => void;
}

export function ShiftEntrySheet({ open, onOpenChange, userId, onSaved }: ShiftEntrySheetProps) {
  const [weekOffset, setWeekOffset] = useState(0); // 0-3 for 4 weeks
  const [shifts, setShifts] = useState<Map<string, ShiftDay>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseWeekStart = useMemo(() => startOfWeek(new Date()), []);

  const currentWeekStart = useMemo(
    () => addWeeks(baseWeekStart, weekOffset),
    [baseWeekStart, weekOffset]
  );

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const weekLabel = useMemo(() => {
    const start = weekDates[0];
    const end = weekDates[6];
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  }, [weekDates]);

  // Load existing shifts for all 4 weeks on open
  useEffect(() => {
    if (!open) return;
    setWeekOffset(0);
    loadAllShifts();
  }, [open]);

  const loadAllShifts = async () => {
    setLoading(true);
    const startDate = format(baseWeekStart, "yyyy-MM-dd");
    const endDate = format(addDays(addWeeks(baseWeekStart, 3), 6), "yyyy-MM-dd");

    const { data } = await supabase
      .from("shift_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("shift_date", startDate)
      .lte("shift_date", endDate);

    const map = new Map<string, ShiftDay>();

    // Initialize all 28 days with defaults
    for (let w = 0; w < 4; w++) {
      for (let d = 0; d < 7; d++) {
        const date = addDays(addWeeks(baseWeekStart, w), d);
        const dateStr = format(date, "yyyy-MM-dd");
        map.set(dateStr, {
          date: dateStr,
          dayOfWeek: date.getDay(),
          isOff: true,
          startTime: "06:00",
          endTime: "18:00",
        });
      }
    }

    // Overlay existing data
    (data || []).forEach((entry: any) => {
      map.set(entry.shift_date, {
        date: entry.shift_date,
        dayOfWeek: new Date(entry.shift_date + "T00:00:00").getDay(),
        isOff: entry.is_off,
        startTime: entry.start_time?.slice(0, 5) || "06:00",
        endTime: entry.end_time?.slice(0, 5) || "18:00",
      });
    });

    setShifts(map);
    setLoading(false);
  };

  const updateShift = (dateStr: string, updates: Partial<ShiftDay>) => {
    setShifts((prev) => {
      const next = new Map(prev);
      const existing = next.get(dateStr);
      if (existing) {
        next.set(dateStr, { ...existing, ...updates });
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);

    const entries = Array.from(shifts.values()).map((s) => ({
      user_id: userId,
      shift_date: s.date,
      start_time: s.isOff ? null : s.startTime,
      end_time: s.isOff ? null : s.endTime,
      is_off: s.isOff,
    }));

    const { error } = await supabase
      .from("shift_entries")
      .upsert(entries as any, { onConflict: "user_id,shift_date" });

    setSaving(false);

    if (error) {
      toast.error("Failed to save shifts");
    } else {
      toast.success("Shifts saved — calendar updated");
      onSaved?.();
      onOpenChange(false);
    }
  };

  const formatTimeLabel = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "pm" : "am";
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${display}:${m.toString().padStart(2, "0")}${period}`;
  };

  const isNightShift = (start: string, end: string) => end < start;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4 max-h-[90vh] overflow-auto">
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Enter Shift Schedule
          </SheetTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Set your shifts for the next 4 weeks. Your calendar will auto-adjust.
          </p>
        </SheetHeader>

        {/* Week switcher */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
            disabled={weekOffset === 0}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <span className="text-sm font-medium">{weekLabel}</span>
            <span className="text-xs text-muted-foreground block">
              Week {weekOffset + 1} of 4
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset(Math.min(3, weekOffset + 1))}
            disabled={weekOffset === 3}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day rows */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">
            Loading shifts...
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {weekDates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const shift = shifts.get(dateStr);
              if (!shift) return null;

              const nightShift = !shift.isOff && isNightShift(shift.startTime, shift.endTime);

              return (
                <div
                  key={dateStr}
                  className={cn(
                    "rounded-lg border p-3 transition-colors",
                    shift.isOff
                      ? "border-border/50 bg-muted/30"
                      : "border-primary/20 bg-primary/5"
                  )}
                >
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-sm font-medium">
                        {DAY_LABELS[date.getDay()]}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(date, "d MMM")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {shift.isOff ? "Off" : "Working"}
                      </span>
                      <Switch
                        checked={!shift.isOff}
                        onCheckedChange={(checked) =>
                          updateShift(dateStr, { isOff: !checked })
                        }
                      />
                    </div>
                  </div>

                  {/* Time pickers */}
                  {!shift.isOff && (
                    <div className="flex items-center gap-2">
                      <select
                        value={shift.startTime}
                        onChange={(e) =>
                          updateShift(dateStr, { startTime: e.target.value })
                        }
                        className="flex-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={`s-${t}`} value={t}>
                            {formatTimeLabel(t)}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted-foreground">to</span>
                      <select
                        value={shift.endTime}
                        onChange={(e) =>
                          updateShift(dateStr, { endTime: e.target.value })
                        }
                        className="flex-1 h-9 rounded-md border border-border bg-background px-2 text-sm"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <option key={`e-${t}`} value={t}>
                            {formatTimeLabel(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Night shift indicator */}
                  {nightShift && (
                    <p className="text-[10px] text-amber-400 mt-1">
                      ⚡ Night shift — crosses midnight
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full"
        >
          {saving ? "Saving…" : "Save All Shifts"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
