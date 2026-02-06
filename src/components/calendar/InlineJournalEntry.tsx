import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

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

interface InlineJournalEntryProps {
  userId: string;
  type: "morning" | "evening";
  onComplete: () => void;
  onBack: () => void;
}

export function InlineJournalEntry({
  userId,
  type,
  onComplete,
  onBack,
}: InlineJournalEntryProps) {
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { toast } = useToast();

  const prompts = type === "morning" ? morningPrompts : eveningPrompts;
  const entryType = type === "morning" ? "morning_primer" : "evening_reflection";
  const today = format(new Date(), "yyyy-MM-dd");
  const isComplete = prompts.every((p) => entries[p.key]?.trim());

  useEffect(() => {
    const fetchExisting = async () => {
      setFetching(true);
      const { data } = await supabase
        .from("journal_entries")
        .select("id, content")
        .eq("user_id", userId)
        .eq("entry_type", entryType)
        .eq("entry_date", today)
        .maybeSingle();

      if (data) {
        setExistingEntryId(data.id);
        setEntries(data.content as Record<string, string>);
      }
      setFetching(false);
    };

    fetchExisting();
  }, [userId, entryType, today]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (existingEntryId) {
        const { error } = await supabase
          .from("journal_entries")
          .update({ content: entries })
          .eq("id", existingEntryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("journal_entries").insert({
          user_id: userId,
          entry_type: entryType,
          content: entries,
          entry_date: today,
        });
        if (error) throw error;
      }

      toast({ title: "Saved", description: "Journal entry saved." });
      onComplete();
    } catch {
      toast({
        title: "Error",
        description: "Failed to save. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm animate-pulse">
        Loading journal...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to checklist
      </button>

      <h3 className="text-base font-semibold">
        {type === "morning" ? "Morning Primer" : "Evening Reflection"}
      </h3>

      {/* Prompts */}
      <div className="space-y-4">
        {prompts.map((prompt, index) => (
          <motion.div
            key={prompt.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className="space-y-1.5"
          >
            <label className="text-sm font-medium">{prompt.label}</label>
            <Textarea
              value={entries[prompt.key] || ""}
              onChange={(e) =>
                setEntries((prev) => ({ ...prev, [prompt.key]: e.target.value }))
              }
              placeholder="Write your thoughts..."
              className="min-h-[80px] bg-input border-border text-foreground placeholder:text-muted-foreground resize-none text-sm"
            />
          </motion.div>
        ))}
      </div>

      {/* Save */}
      <Button
        variant="hero"
        size="lg"
        className="w-full"
        onClick={handleSave}
        disabled={loading || !isComplete}
      >
        {loading ? (
          "Saving..."
        ) : (
          <>
            <Check className="h-4 w-4" />
            {existingEntryId ? "Update Entry" : "Complete Entry"}
          </>
        )}
      </Button>

      {!isComplete && (
        <p className="text-xs text-muted-foreground text-center">
          Complete all prompts to save.
        </p>
      )}
    </motion.div>
  );
}
