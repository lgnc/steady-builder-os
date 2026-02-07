
-- Add strategy_day column to onboarding_data
ALTER TABLE public.onboarding_data
ADD COLUMN strategy_day integer DEFAULT 0;

-- Update handle_new_user to include strategy streak
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.onboarding_data (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.streaks (user_id, streak_type)
  VALUES 
    (NEW.id, 'journaling'),
    (NEW.id, 'training'),
    (NEW.id, 'routine'),
    (NEW.id, 'strategy');
  
  RETURN NEW;
END;
$function$;
