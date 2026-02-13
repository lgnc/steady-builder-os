
CREATE TABLE public.day28_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  day28_review_completed BOOLEAN NOT NULL DEFAULT false,
  workouts_completed INTEGER,
  avg_habits_percent NUMERIC,
  avg_nutrition_percent NUMERIC,
  start_weight NUMERIC,
  end_weight NUMERIC,
  journal_entries INTEGER,
  longest_streak INTEGER,
  reflection_text TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.day28_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own day28 reviews"
ON public.day28_reviews FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own day28 reviews"
ON public.day28_reviews FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own day28 reviews"
ON public.day28_reviews FOR UPDATE
USING (auth.uid() = user_id);
