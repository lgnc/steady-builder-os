CREATE TABLE public.schedule_block_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id uuid NOT NULL REFERENCES public.schedule_blocks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  original_day_of_week integer NOT NULL,
  override_day_of_week integer NOT NULL,
  week_start_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, week_start_date)
);

ALTER TABLE public.schedule_block_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overrides"
  ON public.schedule_block_overrides FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overrides"
  ON public.schedule_block_overrides FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides"
  ON public.schedule_block_overrides FOR DELETE
  USING (auth.uid() = user_id);