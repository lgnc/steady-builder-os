
CREATE TABLE public.daily_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  weight_kg numeric NOT NULL,
  log_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT daily_weights_unique_entry UNIQUE (user_id, log_date)
);

ALTER TABLE public.daily_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weights" ON public.daily_weights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own weights" ON public.daily_weights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own weights" ON public.daily_weights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own weights" ON public.daily_weights FOR DELETE USING (auth.uid() = user_id);
