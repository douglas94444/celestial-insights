-- Preferências de personalização astrológica + eventos de utilização + novos tipos de cache IA

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'interpretation_ai_kind'
      AND e.enumlabel = 'morning_deep'
  ) THEN
    ALTER TYPE public.interpretation_ai_kind ADD VALUE 'morning_deep';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'interpretation_ai_kind'
      AND e.enumlabel = 'natal_essence'
  ) THEN
    ALTER TYPE public.interpretation_ai_kind ADD VALUE 'natal_essence';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'interpretation_ai_kind'
      AND e.enumlabel = 'synastry_deep'
  ) THEN
    ALTER TYPE public.interpretation_ai_kind ADD VALUE 'synastry_deep';
  END IF;
END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS personalization_gender text,
  ADD COLUMN IF NOT EXISTS personalization_tone text NOT NULL DEFAULT 'PRATICO',
  ADD COLUMN IF NOT EXISTS personalization_focus_areas jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.personalization_tone IS
  'Tom preferido para textos IA: MOTIVACIONAL | REALISTA | ESPIRITUAL | PRATICO';
COMMENT ON COLUMN public.profiles.personalization_focus_areas IS
  'JSON array de strings: AMOR, CARREIRA, SAUDE, FAMILIA, FINANCAS, ESPIRITUALIDADE';

CREATE TABLE IF NOT EXISTS public.user_engagement_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  route_key text NOT NULL,
  topic_key text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_engagement_events_user_created_idx
  ON public.user_engagement_events (user_id, created_at DESC);

ALTER TABLE public.user_engagement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own engagement events" ON public.user_engagement_events;
CREATE POLICY "Users insert own engagement events"
  ON public.user_engagement_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users select own engagement events" ON public.user_engagement_events;
CREATE POLICY "Users select own engagement events"
  ON public.user_engagement_events
  FOR SELECT
  USING (auth.uid() = user_id);
