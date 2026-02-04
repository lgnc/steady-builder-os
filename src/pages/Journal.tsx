import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Sun, Moon, Calendar, Flame, ChevronRight, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { BottomNav } from "@/components/layout/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface JournalEntry {
  id: string;
  entry_type: string;
  content: Record<string, string>;
  entry_date: string;
}

const morningPrompts = [
  { key: "intention", label: "What is your primary intention for today?" },
  { key: "focus", label: "What will you focus on to move forward?" },
  { key: "obstacles", label: "What obstacle might arise? How will you handle it?" },
];

const eveningPrompts = [
  { key: "wins", label: "What went well today?" },
  { key: "lessons", label: "What did you learn?" },
  { key: "tomorrow", label: "What's the priority for tomorrow?" },
];

type JournalType = "morning" | "evening";

export default function JournalPage() {
  const [activeTab, setActiveTab] = useState<JournalType>("morning");
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [existingEntry, setExistingEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [streak, setStreak] = useState(0);
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const today = format(new Date(), "yyyy-MM-dd");
      const entryType = activeTab === "morning" ? "morning_primer" : "evening_reflection";

      // Fetch existing entry for today
      const { data: entry } = await supabase
        .from("journal_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("entry_type", entryType)
        .eq("entry_date", today)
        .single();

      if (entry) {
        setExistingEntry({
          ...entry,
          content: entry.content as Record<string, string>,
        });
        setEntries(entry.content as Record<string, string>);
      } else {
        setExistingEntry(null);
        setEntries({});
      }

      // Fetch streak
      const { data: streakData } = await supabase
        .from("streaks")
        .select("current_streak")
        .eq("user_id", user.id)
        .eq("streak_type", "journaling")
        .single();

      if (streakData) setStreak(streakData.current_streak);
    };

    fetchData();
  }, [user, activeTab]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const entryType = activeTab === "morning" ? "morning_primer" : "evening_reflection";

    try {
      if (existingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from("journal_entries")
          .update({ content: entries })
          .eq("id", existingEntry.id);

        if (error) throw error;
      } else {
        // Create new entry
        const { error } = await supabase.from("journal_entries").insert({
          user_id: user.id,
          entry_type: entryType,
          content: entries,
          entry_date: today,
        });

        if (error) throw error;

        // Update streak
        await supabase
          .from("streaks")
          .update({
            current_streak: streak + 1,
            last_completed_date: today,
          })
          .eq("user_id", user.id)
          .eq("streak_type", "journaling");

        setStreak(streak + 1);
      }

      toast({
        title: "Saved",
        description: "Your journal entry has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const prompts = activeTab === "morning" ? morningPrompts : eveningPrompts;
  const isComplete = prompts.every((p) => entries[p.key]?.trim());

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <MobileLayout footer={<BottomNav />}>
      <div className="px-6 py-6 space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
            <div className="streak-badge">
              <Flame className="h-3.5 w-3.5" />
              {streak} day streak
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {format(new Date(), "EEEE, MMMM d")}
          </p>
        </header>

        {/* Tab Switcher */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveTab("morning")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === "morning"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sun className="h-4 w-4" />
            Morning Primer
          </button>
          <button
            onClick={() => setActiveTab("evening")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
              activeTab === "evening"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="h-4 w-4" />
            Evening Reflection
          </button>
        </div>

        {/* Journal Prompts */}
        <div className="space-y-6">
          {prompts.map((prompt, index) => (
            <motion.div
              key={prompt.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <label className="text-sm font-medium">{prompt.label}</label>
              <Textarea
                value={entries[prompt.key] || ""}
                onChange={(e) =>
                  setEntries((prev) => ({ ...prev, [prompt.key]: e.target.value }))
                }
                placeholder="Write your thoughts..."
                className="min-h-[100px] bg-input border-border text-foreground placeholder:text-muted-foreground resize-none"
              />
            </motion.div>
          ))}
        </div>

        {/* Save Button */}
        <Button
          variant="hero"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={loading || !isComplete}
        >
          {loading ? (
            "Saving..."
          ) : existingEntry ? (
            <>
              <Check className="h-4 w-4" />
              Update Entry
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Complete {activeTab === "morning" ? "Morning" : "Evening"} Entry
            </>
          )}
        </Button>

        {/* Tip */}
        {!isComplete && (
          <p className="text-xs text-muted-foreground text-center">
            Complete all prompts to save your entry.
          </p>
        )}
      </div>
    </MobileLayout>
  );
}
