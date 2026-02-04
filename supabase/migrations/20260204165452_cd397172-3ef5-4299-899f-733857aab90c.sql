-- Add nutrition-related columns to onboarding_data
ALTER TABLE public.onboarding_data
ADD COLUMN height_cm integer,
ADD COLUMN weight_kg numeric(5,1),
ADD COLUMN target_weight_kg numeric(5,1),
ADD COLUMN activity_level text DEFAULT 'moderate',
ADD COLUMN calorie_target integer,
ADD COLUMN protein_target integer,
ADD COLUMN carb_target integer,
ADD COLUMN fat_target integer;

-- Create a table for training programs (pre-built program definitions)
CREATE TABLE public.training_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_key text NOT NULL UNIQUE,
  name text NOT NULL,
  days_per_week integer NOT NULL,
  program_type text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create a table for training days within programs
CREATE TABLE public.training_days (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_key text NOT NULL,
  day_number integer NOT NULL,
  name text NOT NULL,
  focus text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create a table for exercises within training days
CREATE TABLE public.training_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_day_id uuid NOT NULL REFERENCES public.training_days(id) ON DELETE CASCADE,
  exercise_order integer NOT NULL,
  name text NOT NULL,
  sets_amateur integer NOT NULL DEFAULT 2,
  sets_beginner integer NOT NULL DEFAULT 3,
  sets_intermediate integer NOT NULL DEFAULT 4,
  sets_advanced integer NOT NULL DEFAULT 5,
  reps text NOT NULL,
  rest_seconds integer DEFAULT 90,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create a table to track user's assigned training days for the week
CREATE TABLE public.user_training_schedule (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  training_day_id uuid NOT NULL REFERENCES public.training_days(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  week_number integer NOT NULL DEFAULT 1,
  completed boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_schedule ENABLE ROW LEVEL SECURITY;

-- Training programs are public read (pre-built content)
CREATE POLICY "Anyone can view training programs"
ON public.training_programs FOR SELECT
USING (true);

CREATE POLICY "Anyone can view training days"
ON public.training_days FOR SELECT
USING (true);

CREATE POLICY "Anyone can view training exercises"
ON public.training_exercises FOR SELECT
USING (true);

-- User training schedule is private
CREATE POLICY "Users can view their own training schedule"
ON public.user_training_schedule FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own training schedule"
ON public.user_training_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own training schedule"
ON public.user_training_schedule FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own training schedule"
ON public.user_training_schedule FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger for user_training_schedule
CREATE TRIGGER update_user_training_schedule_updated_at
BEFORE UPDATE ON public.user_training_schedule
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Insert pre-built training programs
INSERT INTO public.training_programs (program_key, name, days_per_week, program_type, description) VALUES
('3_day_strength', '3-Day Strength & Hypertrophy', 3, 'Strength', 'Full body focus. Maximum efficiency.'),
('4_day_strength', '4-Day Strength & Hypertrophy', 4, 'Strength', 'Upper/lower split. Balanced approach.'),
('4_day_hybrid', '4-Day Hybrid', 4, 'Hybrid', 'Strength + conditioning. Athletic focus.'),
('5_day_hybrid', '5-Day Hybrid Performance', 5, 'Hybrid', 'Complete athletic development.');

-- Insert training days for 3-Day Strength
INSERT INTO public.training_days (program_key, day_number, name, focus) VALUES
('3_day_strength', 1, 'Day A - Full Body Power', 'Compound Movements'),
('3_day_strength', 2, 'Day B - Full Body Strength', 'Strength Focus'),
('3_day_strength', 3, 'Day C - Full Body Hypertrophy', 'Volume Focus');

-- Insert training days for 4-Day Strength
INSERT INTO public.training_days (program_key, day_number, name, focus) VALUES
('4_day_strength', 1, 'Upper A - Push Focus', 'Chest/Shoulders/Triceps'),
('4_day_strength', 2, 'Lower A - Quad Focus', 'Quads/Glutes'),
('4_day_strength', 3, 'Upper B - Pull Focus', 'Back/Biceps'),
('4_day_strength', 4, 'Lower B - Posterior Focus', 'Hamstrings/Glutes');

-- Insert training days for 4-Day Hybrid
INSERT INTO public.training_days (program_key, day_number, name, focus) VALUES
('4_day_hybrid', 1, 'Strength - Upper', 'Push/Pull Strength'),
('4_day_hybrid', 2, 'Conditioning', 'Metabolic Work'),
('4_day_hybrid', 3, 'Strength - Lower', 'Leg Strength'),
('4_day_hybrid', 4, 'Athletic', 'Power & Agility');

-- Insert training days for 5-Day Hybrid
INSERT INTO public.training_days (program_key, day_number, name, focus) VALUES
('5_day_hybrid', 1, 'Push', 'Chest/Shoulders/Triceps'),
('5_day_hybrid', 2, 'Pull', 'Back/Biceps'),
('5_day_hybrid', 3, 'Conditioning', 'Metabolic Work'),
('5_day_hybrid', 4, 'Legs', 'Full Leg Development'),
('5_day_hybrid', 5, 'Athletic', 'Power & Sport');