import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, ChevronUp, ChevronDown, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Habit {
  id: string;
  title: string;
  habit_type: string;
  sort_order: number;
}

interface HabitEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onClose: () => void;
}

export function HabitEditSheet({ open, onOpenChange, userId, onClose }: HabitEditSheetProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"build" | "break">("build");
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    if (!userId || !open) return;
    setLoading(true);

    const { data } = await supabase
      .from("habits")
      .select("id, title, habit_type, sort_order")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("sort_order");

    setHabits((data ?? []) as Habit[]);
    setLoading(false);
  }, [userId, open]);

  useEffect(() => {
    if (open) {
      fetchHabits();
      setNewTitle("");
      setNewType("build");
    }
  }, [open, fetchHabits]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  const addHabit = async () => {
    const title = newTitle.trim();
    if (!title) return;

    const nextOrder = habits.length > 0 ? Math.max(...habits.map((h) => h.sort_order)) + 1 : 0;

    const { data } = await supabase
      .from("habits")
      .insert({
        user_id: userId,
        title,
        habit_type: newType,
        sort_order: nextOrder,
      })
      .select("id, title, habit_type, sort_order")
      .single();

    if (data) {
      setHabits((prev) => [...prev, data as Habit]);
      setNewTitle("");
    }
  };

  const deleteHabit = async (habitId: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== habitId));

    // Soft delete
    await supabase
      .from("habits")
      .update({ is_active: false })
      .eq("id", habitId);
  };

  const moveHabit = async (habitId: string, direction: "up" | "down") => {
    const idx = habits.findIndex((h) => h.id === habitId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === habits.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newHabits = [...habits];
    [newHabits[idx], newHabits[swapIdx]] = [newHabits[swapIdx], newHabits[idx]];

    const updated = newHabits.map((h, i) => ({ ...h, sort_order: i }));
    setHabits(updated);

    await Promise.all([
      supabase
        .from("habits")
        .update({ sort_order: updated[idx].sort_order })
        .eq("id", updated[idx].id),
      supabase
        .from("habits")
        .update({ sort_order: updated[swapIdx].sort_order })
        .eq("id", updated[swapIdx].id),
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4 max-h-[85vh] overflow-auto">
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="text-left mb-4">
          <SheetTitle className="text-lg font-semibold">Edit Habits</SheetTitle>
        </SheetHeader>

        {/* Habit list */}
        {loading ? (
          <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">
            Loading...
          </div>
        ) : habits.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No habits yet. Add one below.
          </div>
        ) : (
          <div className="space-y-1 mb-4">
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => {
                const isBuild = habit.habit_type === "build";
                const accentClass = isBuild ? "text-emerald-500" : "text-rose-500";

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    className="flex items-center gap-3 py-3 px-3 rounded-lg bg-transparent"
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => moveHabit(habit.id, "up")}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveHabit(habit.id, "down")}
                        className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {isBuild ? (
                        <Sparkles className={cn("h-3.5 w-3.5 shrink-0", accentClass)} />
                      ) : (
                        <Shield className={cn("h-3.5 w-3.5 shrink-0", accentClass)} />
                      )}
                      <span className="flex-1 text-sm truncate">{habit.title}</span>
                    </div>

                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="p-1.5 text-destructive/70 hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Add habit form */}
        <div className="border-t border-border pt-4 space-y-3">
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setNewType("build")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                newType === "build"
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-muted text-muted-foreground border border-transparent hover:bg-accent"
              )}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Build
            </button>
            <button
              onClick={() => setNewType("break")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5",
                newType === "break"
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  : "bg-muted text-muted-foreground border border-transparent hover:bg-accent"
              )}
            >
              <Shield className="h-3.5 w-3.5" />
              Break
            </button>
          </div>

          {/* Input + add button */}
          <div className="flex items-center gap-2">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a new habit..."
              className="flex-1 h-10 bg-input border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") addHabit();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={addHabit}
              disabled={!newTitle.trim()}
              className="h-10 w-10 text-primary shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
