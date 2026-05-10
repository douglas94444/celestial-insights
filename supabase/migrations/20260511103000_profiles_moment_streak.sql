-- Sequência Momento: sincronizar entre dispositivos (opcional; cliente faz fallback em localStorage)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moment_streak integer NOT NULL DEFAULT 0;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moment_last_visit_ymd text;

COMMENT ON COLUMN public.profiles.moment_streak IS 'Dias consecutivos abrindo Momento (regra data SP)';
COMMENT ON COLUMN public.profiles.moment_last_visit_ymd IS 'Última visita YYYY-MM-DD America/Sao_Paulo';
