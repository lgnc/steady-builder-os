
-- Add schedule_mode column to schedule_blocks
ALTER TABLE public.schedule_blocks ADD COLUMN schedule_mode text NOT NULL DEFAULT 'home';

-- Create user_schedule_mode table
CREATE TABLE public.user_schedule_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  week_start_date date NOT NULL,
  active_mode text NOT NULL DEFAULT 'home',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.user_schedule_mode ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own schedule mode"
  ON public.user_schedule_mode FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own schedule mode"
  ON public.user_schedule_mode FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schedule mode"
  ON public.user_schedule_mode FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schedule mode"
  ON public.user_schedule_mode FOR DELETE
  USING (auth.uid() = user_id);
