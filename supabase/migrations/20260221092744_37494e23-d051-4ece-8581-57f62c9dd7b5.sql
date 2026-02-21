CREATE TABLE public.weekly_review_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_review_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly summaries"
  ON public.weekly_review_summaries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly summaries"
  ON public.weekly_review_summaries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weekly summaries"
  ON public.weekly_review_summaries FOR UPDATE
  USING (auth.uid() = user_id);