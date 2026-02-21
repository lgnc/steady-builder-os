
-- 1) Add scheduled_date column, backfill from week_start_date
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS scheduled_date date;

-- Backfill existing rows
UPDATE public.workout_sessions
  SET scheduled_date = week_start_date
  WHERE scheduled_date IS NULL;

-- Make it NOT NULL
ALTER TABLE public.workout_sessions
  ALTER COLUMN scheduled_date SET NOT NULL;

-- 2) Drop old unique constraint on (user_id, training_day_id, week_start_date)
DO $$
BEGIN
  -- Find and drop the unique constraint
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.workout_sessions'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 3
  ) THEN
    EXECUTE (
      SELECT 'ALTER TABLE public.workout_sessions DROP CONSTRAINT ' || conname
      FROM pg_constraint
      WHERE conrelid = 'public.workout_sessions'::regclass
      AND contype = 'u'
      AND array_length(conkey, 1) = 3
      LIMIT 1
    );
  END IF;
END $$;

-- Also drop any unique index that might exist
DROP INDEX IF EXISTS public.idx_workout_sessions_unique;

-- 3) Add new unique constraint on (user_id, training_day_id, scheduled_date)
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_user_day_date_unique
  UNIQUE (user_id, training_day_id, scheduled_date);

-- 4) Add index for lookups
CREATE INDEX IF NOT EXISTS idx_workout_sessions_scheduled
  ON public.workout_sessions (user_id, training_day_id, scheduled_date);
