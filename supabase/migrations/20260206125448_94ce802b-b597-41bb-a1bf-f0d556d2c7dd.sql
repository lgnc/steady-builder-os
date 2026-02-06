
-- Add training_day_id to schedule_blocks to link calendar training blocks to actual training days
ALTER TABLE public.schedule_blocks 
ADD COLUMN training_day_id UUID REFERENCES public.training_days(id);

-- Create workout_logs table for per-set logging
CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  training_day_id UUID NOT NULL REFERENCES public.training_days(id),
  exercise_id UUID NOT NULL REFERENCES public.training_exercises(id),
  week_number INTEGER NOT NULL DEFAULT 1,
  set_number INTEGER NOT NULL,
  weight_kg NUMERIC,
  reps_completed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_logs
CREATE POLICY "Users can view their own workout logs"
ON public.workout_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs"
ON public.workout_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
ON public.workout_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
ON public.workout_logs FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_workout_logs_updated_at
BEFORE UPDATE ON public.workout_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Add index for performance
CREATE INDEX idx_workout_logs_user_exercise ON public.workout_logs(user_id, exercise_id, week_number);
CREATE INDEX idx_schedule_blocks_training_day ON public.schedule_blocks(training_day_id);
