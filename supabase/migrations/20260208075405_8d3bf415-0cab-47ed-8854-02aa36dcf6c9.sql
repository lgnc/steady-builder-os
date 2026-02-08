
-- Create habits table
CREATE TABLE public.habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  habit_type TEXT NOT NULL DEFAULT 'build',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_habits_user_id ON public.habits(user_id);

-- Enable RLS
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

-- RLS policies for habits
CREATE POLICY "Users can view their own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- Create habit_completions table
CREATE TABLE public.habit_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_habit_completion UNIQUE (user_id, habit_id, completed_date)
);

-- Create index on user_id for fast lookups
CREATE INDEX idx_habit_completions_user_id ON public.habit_completions(user_id);

-- Enable RLS
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for habit_completions
CREATE POLICY "Users can view their own habit completions"
  ON public.habit_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habit completions"
  ON public.habit_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habit completions"
  ON public.habit_completions FOR DELETE
  USING (auth.uid() = user_id);
