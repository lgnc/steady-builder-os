import { useState, useEffect } from "react";
import { differenceInDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface Day28ReviewState {
  shouldShow: boolean;
  trialStart: Date | null;
  loading: boolean;
  dismiss: () => void;
  reopen: () => void;
  reviewIncomplete: boolean;
}

export function useDay28Review(userId: string | undefined): Day28ReviewState {
  const [shouldShow, setShouldShow] = useState(false);
  const [trialStart, setTrialStart] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [reviewIncomplete, setReviewIncomplete] = useState(false);

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
          .select("day28_review_completed")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      setLoading(false);

      if (!onboardingRes.data) return;

      const start = new Date(onboardingRes.data.created_at);
      setTrialStart(start);

      const daysSinceStart = differenceInDays(new Date(), start);
      const isDay28 = daysSinceStart >= 28;
      const completed = reviewRes.data?.day28_review_completed === true;

      if (isDay28 && !completed) {
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
  };
}
