-- routine_checklist_items: user's personalised routine template
CREATE TABLE public.routine_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  routine_type TEXT NOT NULL DEFAULT 'morning_routine',
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.routine_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklist items"
  ON public.routine_checklist_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checklist items"
  ON public.routine_checklist_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist items"
  ON public.routine_checklist_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist items"
  ON public.routine_checklist_items FOR DELETE
  USING (auth.uid() = user_id);

-- routine_checklist_completions: daily completion records
CREATE TABLE public.routine_checklist_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  checklist_item_id UUID NOT NULL REFERENCES public.routine_checklist_items(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (checklist_item_id, completed_date)
);

ALTER TABLE public.routine_checklist_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own completions"
  ON public.routine_checklist_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own completions"
  ON public.routine_checklist_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own completions"
  ON public.routine_checklist_completions FOR DELETE
  USING (auth.uid() = user_id);