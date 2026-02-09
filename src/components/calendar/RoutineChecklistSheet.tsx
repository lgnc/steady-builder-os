import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Trash2, ChevronUp, ChevronDown, Pencil, Flame, X } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InlineJournalEntry } from "./InlineJournalEntry";

const DEFAULT_MORNING_ITEMS = [
  "Hydrate (500ml water)",
  "Make bed",
  "Cold shower / wash face",
  "10-min stretch or mobility",
  "Morning journal entry",
  "Review today's schedule",
];

const DEFAULT_EVENING_ITEMS = [
  "Prepare tomorrow's clothes",
  "Review tomorrow's schedule",
  "10-min reading",
  "Gratitude journal",
  "Lights out",
];

const DEFAULT_STRATEGY_ITEMS = [
  "Review upcoming week's commitments",
  "Schedule all training sessions",
  "Plan meals and grocery shop",
  "Block social events and meetings",
  "Identify high-energy vs low-energy days",
  "Set top 3 priorities for the week",
];

interface ChecklistItem {
  id: string;
  title: string;
  sort_order: number;
}

interface RoutineChecklistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  routineType: string;
}

export function RoutineChecklistSheet({
  open,
  onOpenChange,
  userId,
  routineType,
}: RoutineChecklistSheetProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [streak, setStreak] = useState(0);
  const [allCompleteCelebrated, setAllCompleteCelebrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [journalView, setJournalView] = useState<"morning" | "evening" | null>(null);

  const today = format(new Date(), "yyyy-MM-dd");
  const completedCount = completedIds.size;
  const totalCount = items.length;
  const allComplete = totalCount > 0 && completedCount === totalCount;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const routineLabel = routineType === "morning_routine" 
    ? "Morning Routine" 
    : routineType === "strategy" 
    ? "Strategy Block" 
    : "Evening Routine";

  // Detect if an item title is a journal entry link
  const isJournalItem = (title: string) => {
    const lower = title.toLowerCase();
    return lower.includes("journal") || lower.includes("gratitude journal");
  };

  const getJournalType = (): "morning" | "evening" => {
    return routineType === "morning_routine" ? "morning" : "evening";
  };

  const handleJournalItemClick = (itemId: string) => {
    setJournalView(getJournalType());
  };

  const handleJournalComplete = (itemId: string) => {
    // Auto-check the journal item after completing the entry
    if (!completedIds.has(itemId)) {
      toggleItem(itemId);
    }
    setJournalView(null);
  };


  // Fetch items + completions + streak
  const fetchData = useCallback(async () => {
    if (!userId || !open) return;
    setLoading(true);

    const [itemsRes, completionsRes, streakRes] = await Promise.all([
      supabase
        .from("routine_checklist_items")
        .select("id, title, sort_order")
        .eq("user_id", userId)
        .eq("routine_type", routineType)
        .order("sort_order"),
      supabase
        .from("routine_checklist_completions")
        .select("checklist_item_id")
        .eq("user_id", userId)
        .eq("completed_date", today),
      supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", userId)
        .eq("streak_type", routineType)
        .maybeSingle(),
    ]);

    setItems(itemsRes.data ?? []);
    if (completionsRes.data) {
      setCompletedIds(new Set(completionsRes.data.map((c: any) => c.checklist_item_id)));
    }
    if (streakRes.data) setStreak(streakRes.data.current_streak ?? 0);
    setLoading(false);
  }, [userId, routineType, today, open]);

  useEffect(() => {
    if (open) {
      setAllCompleteCelebrated(false);
      setJournalView(null);
      fetchData();
    }
  }, [open, fetchData]);

  // Toggle a checklist item
  const toggleItem = async (itemId: string) => {
    const isCompleted = completedIds.has(itemId);

    // Optimistic update
    const newCompleted = new Set(completedIds);
    if (isCompleted) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedIds(newCompleted);

    if (isCompleted) {
      // Remove completion
      await supabase
        .from("routine_checklist_completions")
        .delete()
        .eq("user_id", userId)
        .eq("checklist_item_id", itemId)
        .eq("completed_date", today);
    } else {
      // Add completion
      await supabase.from("routine_checklist_completions").insert({
        user_id: userId,
        checklist_item_id: itemId,
        completed_date: today,
      });
    }

    // Check if all items are now complete
    const newAllComplete = items.length > 0 && newCompleted.size === items.length;
    if (newAllComplete && !allCompleteCelebrated) {
      setAllCompleteCelebrated(true);
      await updateStreak();
    }
  };

  // Update streak when all items completed
  const updateStreak = async () => {
    const { data: streakData } = await supabase
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .eq("streak_type", routineType)
      .maybeSingle();

    if (streakData) {
      // Only increment if not already completed today
      if (streakData.last_completed_date === today) return;

      const newStreak = streakData.current_streak + 1;
      const longestStreak = Math.max(newStreak, streakData.longest_streak ?? 0);

      await supabase
        .from("streaks")
        .update({
          current_streak: newStreak,
          longest_streak: longestStreak,
          last_completed_date: today,
        })
        .eq("id", streakData.id);

      setStreak(newStreak);
    } else {
      // Create streak row if missing
      await supabase.from("streaks").insert({
        user_id: userId,
        streak_type: routineType,
        current_streak: 1,
        longest_streak: 1,
        last_completed_date: today,
      });
      setStreak(1);
    }
  };

  // Add new item
  const addItem = async () => {
    const title = newItemTitle.trim();
    if (!title) return;

    const nextOrder = items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;

    const { data } = await supabase
      .from("routine_checklist_items")
      .insert({
        user_id: userId,
        routine_type: routineType,
        title,
        sort_order: nextOrder,
      })
      .select("id, title, sort_order")
      .single();

    if (data) {
      setItems((prev) => [...prev, data]);
      setNewItemTitle("");
    }
  };

  // Delete item
  const deleteItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });

    await supabase.from("routine_checklist_items").delete().eq("id", itemId);
  };

  // Reorder item
  const moveItem = async (itemId: string, direction: "up" | "down") => {
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === items.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const newItems = [...items];
    [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];

    // Update sort_order
    const updated = newItems.map((item, i) => ({ ...item, sort_order: i }));
    setItems(updated);

    // Persist both swapped items
    await Promise.all([
      supabase
        .from("routine_checklist_items")
        .update({ sort_order: updated[idx].sort_order })
        .eq("id", updated[idx].id),
      supabase
        .from("routine_checklist_items")
        .update({ sort_order: updated[swapIdx].sort_order })
        .eq("id", updated[swapIdx].id),
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl px-5 pb-8 pt-4 max-h-[85vh] overflow-auto">
        {/* Drag handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        <SheetHeader className="text-left mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg font-semibold">{routineLabel}</SheetTitle>
            <div className="flex items-center gap-2">
              <div className="streak-badge">
                <Flame className="h-3.5 w-3.5" />
                {streak}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditMode(!editMode)}
                className={cn("h-8 px-2", editMode && "text-primary")}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">
              {completedCount}/{totalCount} complete
            </span>
            {allComplete && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs font-medium text-primary flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" /> Done!
              </motion.span>
            )}
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Journal inline view */}
        {journalView ? (
          <InlineJournalEntry
            userId={userId}
            type={journalView}
            onComplete={() => {
              // Find the journal item and auto-check it
              const journalItem = items.find((i) => isJournalItem(i.title));
              if (journalItem) {
                handleJournalComplete(journalItem.id);
              } else {
                setJournalView(null);
              }
            }}
            onBack={() => setJournalView(null)}
          />
        ) : (
          <>
            {/* Checklist */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No checklist items yet. Tap the pencil icon to add some.
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => {
                    const checked = completedIds.has(item.id);
                    const isJournal = isJournalItem(item.title);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className={cn(
                          "flex items-center gap-3 py-3 px-3 rounded-lg transition-colors",
                          checked ? "bg-primary/5" : "bg-transparent",
                          !editMode && "active:bg-muted/50"
                        )}
                      >
                        {!editMode ? (
                          <>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="h-5 w-5"
                            />
                            <span
                              onClick={() => {
                                if (isJournal && !checked) {
                                  handleJournalItemClick(item.id);
                                }
                              }}
                              className={cn(
                                "flex-1 text-sm transition-all",
                                checked && "line-through text-muted-foreground",
                                isJournal && !checked && "text-primary underline underline-offset-2 cursor-pointer"
                              )}
                            >
                              {item.title}
                            </span>
                            {checked && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="text-primary"
                              >
                                <Check className="h-4 w-4" />
                              </motion.div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col gap-0.5">
                              <button
                                onClick={() => moveItem(item.id, "up")}
                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => moveItem(item.id, "down")}
                                className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="flex-1 text-sm">{item.title}</span>
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="p-1.5 text-destructive/70 hover:text-destructive transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}

        {/* Add new item (edit mode) */}
        {editMode && !journalView && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 flex items-center gap-2"
          >
            <Input
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              placeholder="Add new item..."
              className="flex-1 h-10 bg-input border-border"
              onKeyDown={(e) => {
                if (e.key === "Enter") addItem();
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={addItem}
              disabled={!newItemTitle.trim()}
              className="h-10 w-10 shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </motion.div>
        )}

        {/* All-complete celebration */}
        <AnimatePresence>
          {allComplete && allCompleteCelebrated && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-center"
            >
              <p className="text-primary font-semibold text-sm">
                🔥 {routineLabel} complete!
              </p>
              <p className="text-muted-foreground text-xs mt-1">
                {streak} day streak — keep building momentum.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
