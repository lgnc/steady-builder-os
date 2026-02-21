
-- 1) Create scheduled_workouts table
CREATE TABLE public.scheduled_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  training_day_id uuid NOT NULL REFERENCES public.training_days(id),
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  completed_at timestamptz NULL,
  workout_session_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scheduled_workouts_user_day_date_unique UNIQUE (user_id, training_day_id, scheduled_date)
);

-- Indexes
CREATE INDEX idx_scheduled_workouts_user_date ON public.scheduled_workouts (user_id, scheduled_date);
CREATE INDEX idx_scheduled_workouts_user_day_date ON public.scheduled_workouts (user_id, training_day_id, scheduled_date);

-- RLS
ALTER TABLE public.scheduled_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scheduled workouts"
  ON public.scheduled_workouts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scheduled workouts"
  ON public.scheduled_workouts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scheduled workouts"
  ON public.scheduled_workouts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scheduled workouts"
  ON public.scheduled_workouts FOR DELETE
  USING (auth.uid() = user_id);

-- 2) Add scheduled_workout_id to workout_sessions (nullable for now to not break existing rows)
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS scheduled_workout_id uuid REFERENCES public.scheduled_workouts(id) ON DELETE CASCADE;

-- Add foreign key from scheduled_workouts.workout_session_id -> workout_sessions
ALTER TABLE public.scheduled_workouts
  ADD CONSTRAINT scheduled_workouts_session_fk
  FOREIGN KEY (workout_session_id) REFERENCES public.workout_sessions(id) ON DELETE SET NULL;
