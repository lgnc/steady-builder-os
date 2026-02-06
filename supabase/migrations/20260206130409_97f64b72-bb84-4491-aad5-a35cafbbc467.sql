
-- Add work_type to onboarding_data
ALTER TABLE public.onboarding_data 
ADD COLUMN work_type TEXT NOT NULL DEFAULT 'standard';

-- Add gym_commute_minutes to onboarding_data (one-way, in minutes)
ALTER TABLE public.onboarding_data 
ADD COLUMN gym_commute_minutes INTEGER NOT NULL DEFAULT 15;
