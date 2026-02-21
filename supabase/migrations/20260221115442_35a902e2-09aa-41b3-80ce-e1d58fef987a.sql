
-- Create workout_sessions table
CREATE TABLE public.workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  training_day_id uuid NOT NULL REFERENCES public.training_days(id),
  week_start_date date NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  performed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, training_day_id, week_start_date)
);

CREATE INDEX idx_workout_sessions_lookup ON public.workout_sessions (user_id, training_day_id, week_start_date);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON public.workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sessions" ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create workout_sets table
CREATE TABLE public.workout_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  training_exercise_id uuid NOT NULL REFERENCES public.training_exercises(id),
  set_index int NOT NULL,
  reps int NULL,
  weight_kg numeric NULL,
  duration_seconds int NULL,
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_workout_sets_session ON public.workout_sets (session_id);
CREATE INDEX idx_workout_sets_exercise ON public.workout_sets (training_exercise_id);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sets" ON public.workout_sets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "Users can insert their own sets" ON public.workout_sets FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "Users can update their own sets" ON public.workout_sets FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));
CREATE POLICY "Users can delete their own sets" ON public.workout_sets FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.workout_sessions ws WHERE ws.id = session_id AND ws.user_id = auth.uid()));

-- Migrate existing workout_logs data
INSERT INTO public.workout_sessions (user_id, training_day_id, week_start_date, status, created_at)
SELECT DISTINCT user_id, training_day_id, COALESCE(week_start_date, CURRENT_DATE), 'completed', MIN(created_at)
FROM public.workout_logs
WHERE week_start_date IS NOT NULL
GROUP BY user_id, training_day_id, week_start_date
ON CONFLICT DO NOTHING;

INSERT INTO public.workout_sets (session_id, training_exercise_id, set_index, reps, weight_kg, duration_seconds, created_at, updated_at)
SELECT ws.id, wl.exercise_id, wl.set_number, wl.reps_completed, wl.weight_kg, wl.duration_seconds, wl.created_at, wl.updated_at
FROM public.workout_logs wl
JOIN public.workout_sessions ws ON ws.user_id = wl.user_id AND ws.training_day_id = wl.training_day_id AND ws.week_start_date = wl.week_start_date
WHERE wl.week_start_date IS NOT NULL;
