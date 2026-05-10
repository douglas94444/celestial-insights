-- Eventos de pré-visualização de mapa (quota por utilizador na server function calculateChartFn).

CREATE TABLE public.chart_preview_calc_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chart_preview_calc_events_user_created_idx
  ON public.chart_preview_calc_events (user_id, created_at DESC);

ALTER TABLE public.chart_preview_calc_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own chart_preview_calc_events"
  ON public.chart_preview_calc_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users select own chart_preview_calc_events"
  ON public.chart_preview_calc_events
  FOR SELECT
  USING (auth.uid() = user_id);
