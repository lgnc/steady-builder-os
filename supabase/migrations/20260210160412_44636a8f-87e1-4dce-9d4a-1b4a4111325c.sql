
-- Add age column to onboarding_data
ALTER TABLE public.onboarding_data ADD COLUMN age integer;

-- Create nutrition_profiles table
CREATE TABLE public.nutrition_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  bmr integer NOT NULL,
  tdee integer NOT NULL,
  calorie_target integer NOT NULL,
  protein_g integer NOT NULL,
  fat_g integer NOT NULL,
  carb_g integer NOT NULL,
  meals_per_day integer NOT NULL DEFAULT 3,
  dietary_filters text[] DEFAULT '{}'::text[],
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.nutrition_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own nutrition profile"
  ON public.nutrition_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition profile"
  ON public.nutrition_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition profile"
  ON public.nutrition_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Create meal_plans table
CREATE TABLE public.meal_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  plan_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  compliance_score numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '8 weeks')
);

ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal plans"
  ON public.meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal plans"
  ON public.meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal plans"
  ON public.meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Create meal_completions table
CREATE TABLE public.meal_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  meal_slot text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meal_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meal completions"
  ON public.meal_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own meal completions"
  ON public.meal_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meal completions"
  ON public.meal_completions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meal completions"
  ON public.meal_completions FOR DELETE
  USING (auth.uid() = user_id);

-- Create favourite_meals table
CREATE TABLE public.favourite_meals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  meal_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  meal_slot text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.favourite_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favourite meals"
  ON public.favourite_meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favourite meals"
  ON public.favourite_meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favourite meals"
  ON public.favourite_meals FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger for nutrition_profiles
CREATE TRIGGER update_nutrition_profiles_updated_at
  BEFORE UPDATE ON public.nutrition_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
