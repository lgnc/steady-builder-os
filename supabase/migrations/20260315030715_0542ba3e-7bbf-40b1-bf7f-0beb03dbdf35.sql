ALTER TABLE public.onboarding_data
  ADD COLUMN fifo_shift_start text DEFAULT NULL,
  ADD COLUMN fifo_shift_end text DEFAULT NULL,
  ADD COLUMN fifo_on_site_wake_time text DEFAULT NULL,
  ADD COLUMN fifo_on_site_bedtime text DEFAULT NULL;