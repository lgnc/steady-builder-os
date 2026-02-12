
-- Add form_cues to training_exercises
ALTER TABLE public.training_exercises ADD COLUMN form_cues text[] NOT NULL DEFAULT '{}'::text[];

-- Add warmup_items and mobility_items to training_days
ALTER TABLE public.training_days ADD COLUMN warmup_items jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.training_days ADD COLUMN mobility_items jsonb NOT NULL DEFAULT '[]'::jsonb;
