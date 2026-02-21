
-- Add index on (user_id, scheduled_date)
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_user_date
  ON public.scheduled_workouts (user_id, scheduled_date);

-- Add unique constraint on workout_sessions (user_id, scheduled_workout_id) where not null
CREATE UNIQUE INDEX IF NOT EXISTS workout_sessions_user_sw_unique
  ON public.workout_sessions (user_id, scheduled_workout_id)
  WHERE scheduled_workout_id IS NOT NULL;
