
CREATE TABLE public.shift_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shift_date DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE,
  end_time TIME WITHOUT TIME ZONE,
  is_off BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: one entry per user per date
ALTER TABLE public.shift_entries ADD CONSTRAINT shift_entries_user_date_unique UNIQUE (user_id, shift_date);

-- Enable RLS
ALTER TABLE public.shift_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own shift entries" ON public.shift_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shift entries" ON public.shift_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shift entries" ON public.shift_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shift entries" ON public.shift_entries FOR DELETE USING (auth.uid() = user_id);
