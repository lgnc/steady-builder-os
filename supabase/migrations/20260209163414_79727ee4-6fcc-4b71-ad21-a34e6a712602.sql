
-- Create reading_logs table
CREATE TABLE public.reading_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  pages_read INTEGER NOT NULL DEFAULT 0,
  minutes_read INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);

-- Enable RLS
ALTER TABLE public.reading_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own reading logs"
ON public.reading_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reading logs"
ON public.reading_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reading logs"
ON public.reading_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reading logs"
ON public.reading_logs FOR DELETE
USING (auth.uid() = user_id);
