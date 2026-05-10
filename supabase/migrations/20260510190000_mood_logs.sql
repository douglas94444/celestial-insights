CREATE TABLE public.mood_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  chart_id UUID REFERENCES public.charts (id) ON DELETE SET NULL,
  ymd TEXT NOT NULL,
  mood_score SMALLINT NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  emotions TEXT[] DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX mood_logs_user_ymd_idx ON public.mood_logs (user_id, ymd);

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own moods"
ON public.mood_logs
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
