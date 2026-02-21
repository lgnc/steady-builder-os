
-- Drop the old date-based unique constraint that causes conflicts
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_user_day_date_unique;

-- Also drop the old index-based one if it exists
DROP INDEX IF EXISTS workout_sessions_user_day_date_unique;
