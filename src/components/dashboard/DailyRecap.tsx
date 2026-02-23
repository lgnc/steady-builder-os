import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface RecapContext {
  completionPct: number;
  habitCounts: { total: number; completed: number };
  nutritionCounts: { total: number; completed: number };
  anchorCompletions: Record<string, boolean>;
  isTrainingDay: boolean;
  weeklyCompletion: {
    habitsPercent: number;
    trainingCompleted: number;
    trainingTotal: number;
    nutritionPercent: number;
  } | null;
}

interface DailyRecapProps {
  context: RecapContext;
}

const RECAP_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-recap`;

export function DailyRecap({ context }: DailyRecapProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [recap, setRecap] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastContextHash, setLastContextHash] = useState("");
  const { session } = useAuth();

  const contextHash = JSON.stringify(context);

  const fetchRecap = useCallback(async (force = false) => {
    if (!session) return;
    if (!force && recap && lastContextHash === contextHash) return;

    setIsLoading(true);
    try {
      const resp = await fetch(RECAP_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(context),
      });

      if (!resp.ok) {
        toast.error("Couldn't generate your recap. Try again.");
        return;
      }

      const data = await resp.json();
      setRecap(data.recap);
      setLastContextHash(contextHash);
    } catch {
      toast.error("Failed to reach the server. Check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, [session, context, contextHash, recap, lastContextHash]);

  const handleOpen = () => {
    setIsOpen(true);
    fetchRecap();
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 right-4 z-50"
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg glow-primary"
              onClick={handleOpen}
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recap Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col"
            style={{ maxHeight: "60vh" }}
          >
            <div className="flex flex-col h-full bg-card border-t border-border rounded-t-2xl overflow-hidden shadow-lg">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm text-foreground">Daily Recap</h3>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => fetchRecap(true)}
                    disabled={isLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {isLoading && !recap ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-4/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : recap ? (
                  <div className="relative">
                    {isLoading && (
                      <div className="absolute top-0 right-0">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                      {recap}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Tap refresh to generate your recap.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
