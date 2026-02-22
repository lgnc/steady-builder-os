ALTER TABLE public.user_schedule_mode
  ADD COLUMN IF NOT EXISTS shift_type text NOT NULL DEFAULT 'days',
  ADD COLUMN IF NOT EXISTS shift_start time without time zone,
  ADD COLUMN IF NOT EXISTS shift_end time without time zone;