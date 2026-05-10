-- Cache de interpretações geradas por IA (por utilizador + tipo + fingerprint).

CREATE TYPE public.interpretation_ai_kind AS ENUM (
  'natal_summary',
  'natal_planet',
  'synastry',
  'transit_day'
);

CREATE TABLE public.interpretation_ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind public.interpretation_ai_kind NOT NULL,
  fingerprint text NOT NULL,
  chart_id uuid REFERENCES public.charts (id) ON DELETE SET NULL,
  synastry_id uuid REFERENCES public.synastries (id) ON DELETE SET NULL,
  transit_date date,
  prompt_version text NOT NULL DEFAULT 'v1',
  model text NOT NULL,
  content text NOT NULL,
  tokens_in integer,
  tokens_out integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, fingerprint)
);

CREATE INDEX interpretation_ai_cache_user_created_idx
  ON public.interpretation_ai_cache (user_id, created_at DESC);

ALTER TABLE public.interpretation_ai_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own interpretation_ai_cache"
  ON public.interpretation_ai_cache
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interpretation_ai_cache"
  ON public.interpretation_ai_cache
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
