import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Pencil, Shield, Sparkles } from "lucide-react";
import { format, subDays, isToday as isDateToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HabitEditSheet } from "./HabitEditSheet";
import { DailyWeightTracker } from "./DailyWeightTracker";
import { toast } from "sonner";

interface Habit {
  id: string;
  title: string;
  habit_type: string;
  sort_order: number;
  current_streak: number;
  longest_streak: number;
  last_completed_date: string | null;
}

const DEFAULT_HABITS = [
  { title: "No phone first 30 min", habit_type: "break", sort_order: 0 },
  { title: "Read 10 pages", habit_type: "build", sort_order: 1 },
  { title: "Walk 10,000 steps", habit_type: "build", sort_order: 2 },
  { title: "Drink 2L water", habit_type: "build", sort_order: 3 },
];

interface DailyHabitsProps {
  userId: string;
  selectedDate?: Date;
  editable?: boolean;
  onCompletionChange?: (counts: { total: number; completed: number }) => void;
}

export function DailyHabits({ userId, selectedDate, editable = true, onCompletionChange }: DailyHabitsProps) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [seeded, setSeeded] = useState(false);

  const dateObj = selectedDate ?? new Date();
  const dateStr = format(dateObj, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(dateObj, 1), "yyyy-MM-dd");
  const isViewingToday = isDateToday(dateObj);

  const fetchHabits = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [habitsRes, completionsRes] = await Promise.all([
      supabase
        .from("habits")
        .select("id, title, habit_type, sort_order, current_streak, longest_streak, last_completed_date")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("habit_completions")
        .select("habit_id")
        .eq("user_id", userId)
        .eq("completed_date", dateStr),
    ]);

    let fetchedHabits = (habitsRes.data ?? []) as Habit[];

    // Seed defaults if no habits exist
    if (fetchedHabits.length === 0 && !seeded) {
      setSeeded(true);
      const rows = DEFAULT_HABITS.map((h) => ({ ...h, user_id: userId }));
      const { data: seededData } = await supabase
        .from("habits")
        .insert(rows)
        .select("id, title, habit_type, sort_order, current_streak, longest_streak, last_completed_date");
      fetchedHabits = (seededData ?? []) as Habit[];
    }

    // Streak decay only when viewing today
    if (isViewingToday) {
      const today = format(new Date(), "yyyy-MM-dd");
      const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
      const decayIds: string[] = [];
      for (const habit of fetchedHabits) {
        if (habit.current_streak > 0 && habit.last_completed_date) {
          const lastDate = habit.last_completed_date;
          if (lastDate !== today && lastDate !== yesterday) {
            decayIds.push(habit.id);
            habit.current_streak = 0;
          }
        }
      }

      if (decayIds.length > 0) {
        await supabase
          .from("habits")
          .update({ current_streak: 0 })
          .in("id", decayIds);
      }
    }

    setHabits(fetchedHabits);
    if (completionsRes.data) {
      setCompletedIds(new Set(completionsRes.data.map((c: any) => c.habit_id)));
    }
    setLoading(false);
  }, [userId, dateStr, isViewingToday]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  // Report completion counts to parent
  useEffect(() => {
    if (!loading && onCompletionChange) {
      onCompletionChange({ total: habits.length, completed: completedIds.size });
    }
  }, [habits.length, completedIds.size, loading]);

  const toggleHabit = async (habit: Habit) => {
    if (!editable) {
      toast("You can't complete future tasks.");
      return;
    }

    const isCompleted = completedIds.has(habit.id);

    // Optimistic update
    const newCompleted = new Set(completedIds);
    const updatedHabits = [...habits];
    const habitIndex = updatedHabits.findIndex((h) => h.id === habit.id);
    if (habitIndex < 0) return;

    if (isCompleted) {
      newCompleted.delete(habit.id);
      const newStreak = Math.max(0, habit.current_streak - 1);
      updatedHabits[habitIndex] = {
        ...habit,
        current_streak: newStreak,
        last_completed_date: newStreak > 0 ? yesterdayStr : null,
      };
    } else {
      newCompleted.add(habit.id);
      let newStreak: number;
      if (habit.last_completed_date === dateStr) {
        newStreak = habit.current_streak;
      } else if (habit.last_completed_date === yesterdayStr) {
        newStreak = habit.current_streak + 1;
      } else {
        newStreak = 1;
      }
      const newLongest = Math.max(newStreak, habit.longest_streak);
      updatedHabits[habitIndex] = {
        ...habit,
        current_streak: newStreak,
        longest_streak: newLongest,
        last_completed_date: dateStr,
      };
    }

    setCompletedIds(newCompleted);
    setHabits(updatedHabits);

    // Persist
    if (isCompleted) {
      const newStreak = Math.max(0, habit.current_streak - 1);
      await Promise.all([
        supabase
          .from("habit_completions")
          .delete()
          .eq("user_id", userId)
          .eq("habit_id", habit.id)
          .eq("completed_date", dateStr),
        supabase
          .from("habits")
          .update({
            current_streak: newStreak,
            last_completed_date: newStreak > 0 ? yesterdayStr : null,
          })
          .eq("id", habit.id),
      ]);
    } else {
      let newStreak: number;
      if (habit.last_completed_date === dateStr) {
        newStreak = habit.current_streak;
      } else if (habit.last_completed_date === yesterdayStr) {
        newStreak = habit.current_streak + 1;
      } else {
        newStreak = 1;
      }
      const newLongest = Math.max(newStreak, habit.longest_streak);

      await Promise.all([
        supabase.from("habit_completions").insert({
          user_id: userId,
          habit_id: habit.id,
          completed_date: dateStr,
        }),
        supabase
          .from("habits")
          .update({
            current_streak: newStreak,
            longest_streak: newLongest,
            last_completed_date: dateStr,
          })
          .eq("id", habit.id),
      ]);
    }
  };

  if (loading) {
    return (
      <div className="card-ritual">
        <div className="animate-pulse text-sm text-muted-foreground text-center py-4">
          Loading habits...
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Daily Habits</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="card-ritual space-y-1">
          {habits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No habits yet. Tap the pencil to add some.
            </p>
          ) : (
            <AnimatePresence mode="popLayout">
              {habits.map((habit) => {
                const checked = completedIds.has(habit.id);
                const isBuild = habit.habit_type === "build";
                const accentClass = isBuild ? "text-emerald-500" : "text-rose-500";
                const bgCheckedClass = isBuild ? "bg-emerald-500/10" : "bg-rose-500/10";
                const streakColor = isBuild ? "text-emerald-400" : "text-rose-400";
                const checkboxAccent = isBuild
                  ? "data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  : "data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500";

                return (
                  <motion.div
                    key={habit.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className={cn(
                      "flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors",
                      checked ? bgCheckedClass : "bg-transparent"
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleHabit(habit)}
                      className={cn("h-5 w-5", checkboxAccent)}
                      disabled={!editable}
                    />

                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      {!isBuild && (
                        <Shield className={cn("h-3.5 w-3.5 shrink-0", accentClass)} />
                      )}
                      <span
                        className={cn(
                          "text-sm transition-all truncate",
                          checked && "line-through text-muted-foreground"
                        )}
                      >
                        {habit.title}
                      </span>
                    </div>

                    <motion.div
                      key={`streak-${habit.id}-${habit.current_streak}`}
                      initial={{ scale: 0.8, opacity: 0.5 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "flex items-center gap-1 text-xs font-medium shrink-0",
                        habit.current_streak > 0 ? streakColor : "text-muted-foreground/40"
                      )}
                    >
                      <Flame className="h-3 w-3" />
                      <span>{habit.current_streak}</span>
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div className="border-t border-border/50 mt-1 pt-1">
            <DailyWeightTracker userId={userId} selectedDate={selectedDate} editable={editable} />
          </div>
        </div>
      </motion.section>

      <HabitEditSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        userId={userId}
        onClose={() => {
          setEditOpen(false);
          fetchHabits();
        }}
      />
    </>
  );
}
