import { useState, useEffect } from "react";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Day28ReviewData {
  day28_review_completed: boolean;
  workouts_completed: number | null;
  avg_habits_percent: number | null;
  avg_nutrition_percent: number | null;
  start_weight: number | null;
  end_weight: number | null;
  journal_entries: number | null;
  longest_streak: number | null;
  reflection_text: string | null;
  completed_at: string | null;
}

export interface Day28ReviewState {
  /** Auto-trigger modal (day28 reached + not completed + not dismissed) */
  shouldShow: boolean;
  trialStart: Date | null;
  loading: boolean;
  dismiss: () => void;
  reopen: () => void;
  /** Day 28 reached but not completed */
  reviewIncomplete: boolean;
  /** Review has been completed */
  isCompleted: boolean;
  /** Days remaining until day 28 (0 if reached) */
  daysUntilUnlock: number;
  /** Days since trial started */
  daysSinceStart: number;
  /** Saved review snapshot (if completed) */
  savedReview: Day28ReviewData | null;
  /** Whether onboarding exists */
  hasOnboarding: boolean;
}

export function useDay28Review(userId: string | undefined): Day28ReviewState {
  const [shouldShow, setShouldShow] = useState(false);
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [reviewIncomplete, setReviewIncomplete] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [daysUntilUnlock, setDaysUntilUnlock] = useState(28);
  const [daysSinceStart, setDaysSinceStart] = useState(0);
  const [savedReview, setSavedReview] = useState<Day28ReviewData | null>(null);
  const [hasOnboarding, setHasOnboarding] = useState(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const check = async () => {
      const [onboardingRes, reviewRes] = await Promise.all([
        supabase
          .from("onboarding_data")
          .select("created_at")
          .eq("user_id", userId)
          .single(),
        supabase
          .from("day28_reviews")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setLoading(false);

      if (!onboardingRes.data) {
        setHasOnboarding(false);
        return;
      }

      setHasOnboarding(true);
      const start = new Date(onboardingRes.data.created_at);
      setTrialStart(start);

      const days = differenceInDays(new Date(), start);
      setDaysSinceStart(days);
      setDaysUntilUnlock(Math.max(0, 28 - days));

      const completed = reviewRes.data?.day28_review_completed === true;
      setIsCompleted(completed);

      if (completed && reviewRes.data) {
        setSavedReview(reviewRes.data as Day28ReviewData);
      }

      if (days >= 28 && !completed) {
        setReviewIncomplete(true);
        setShouldShow(true);
      }
    };

    check();
  }, [userId]);

  return {
    shouldShow: shouldShow && !dismissed,
    trialStart,
    loading,
    dismiss: () => setDismissed(true),
    reopen: () => setDismissed(false),
    reviewIncomplete,
    isCompleted,
    daysUntilUnlock,
    daysSinceStart,
    savedReview,
    hasOnboarding,
  };
}
