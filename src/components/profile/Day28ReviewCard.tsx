import { motion } from "framer-motion";
import { Lock, ChevronRight, CheckCircle2, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useState } from "react";
import type { Day28ReviewState } from "@/hooks/useDay28Review";

interface Day28ReviewCardProps {
  day28: Day28ReviewState;
  onOpenReview: () => void;
  onOpenResults: () => void;
}

export function Day28ReviewCard({ day28, onOpenReview, onOpenResults }: Day28ReviewCardProps) {
  const [lockedModalOpen, setLockedModalOpen] = useState(false);

  if (day28.loading) return null;

  // No onboarding = show locked with onboarding message
  if (!day28.hasOnboarding) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="card-ritual opacity-60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm">28-Day Review</h3>
                <p className="text-xs text-muted-foreground">Complete onboarding to start</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    );
  }

  // Completed state
  if (day28.isCompleted) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div
          className="card-ritual cursor-pointer active:scale-[0.98] transition-transform"
          onClick={onOpenResults}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-medium text-sm">28-Day Review</h3>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              View your results <ChevronRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </motion.section>
    );
  }

  // Ready state (day 28+)
  if (day28.daysUntilUnlock === 0) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div
          className={cn(
            "card-ritual cursor-pointer active:scale-[0.98] transition-transform",
            "border-primary/30 shadow-[0_0_12px_-4px_hsl(var(--primary)/0.3)]"
          )}
          onClick={onOpenReview}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-primary" />
              <div>
                <h3 className="font-medium text-sm">28-Day Review</h3>
                <p className="text-xs text-primary/80">Ready</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </motion.section>
    );
  }

  // Locked state (before day 28)
  return (
    <>
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div
          className="card-ritual cursor-pointer active:scale-[0.98] transition-transform opacity-70"
          onClick={() => setLockedModalOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <div>
                <h3 className="font-medium text-sm">28-Day Review</h3>
                <p className="text-xs text-muted-foreground">
                  Unlocks in {day28.daysUntilUnlock} day{day28.daysUntilUnlock !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <Dialog open={lockedModalOpen} onOpenChange={setLockedModalOpen}>
        <DialogContent className="max-w-[320px] bg-card border-border text-center space-y-4 p-6">
          <Lock className="h-8 w-8 text-muted-foreground mx-auto" />
          <h3 className="text-lg font-semibold">Not yet.</h3>
          <p className="text-sm text-muted-foreground">
            Finish your first 28 days and we'll show exactly what changed.
          </p>
          <p className="text-xs text-muted-foreground italic">Finish strong.</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
