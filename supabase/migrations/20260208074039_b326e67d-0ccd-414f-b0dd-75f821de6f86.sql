
-- Add work_to_gym_minutes and gym_to_work_direct columns to onboarding_data
ALTER TABLE public.onboarding_data
ADD COLUMN work_to_gym_minutes integer NOT NULL DEFAULT 15;

ALTER TABLE public.onboarding_data
ADD COLUMN gym_to_work_direct boolean NOT NULL DEFAULT false;
