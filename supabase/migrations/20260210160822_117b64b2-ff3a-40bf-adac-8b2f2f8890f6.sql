
-- Add unique constraint for upsert on meal_completions
ALTER TABLE public.meal_completions
  ADD CONSTRAINT meal_completions_unique_entry UNIQUE (user_id, meal_plan_id, meal_date, meal_slot);
