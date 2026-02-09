
ALTER TABLE public.onboarding_data
  ADD COLUMN weekend_wake_time time without time zone DEFAULT '07:00:00'::time without time zone,
  ADD COLUMN weekend_bedtime time without time zone DEFAULT NULL,
  ADD COLUMN preferred_training_days text[] DEFAULT '{}'::text[],
  ADD COLUMN fifo_shift_length integer DEFAULT NULL,
  ADD COLUMN fifo_shift_type text DEFAULT NULL,
  ADD COLUMN gender text DEFAULT NULL,
  ADD COLUMN dietary_choices text[] DEFAULT '{}'::text[],
  ADD COLUMN allergies text DEFAULT NULL,
  ADD COLUMN sensitivities text DEFAULT NULL,
  ADD COLUMN onboarding_habits_build text[] DEFAULT '{}'::text[],
  ADD COLUMN onboarding_habits_break text[] DEFAULT '{}'::text[];
