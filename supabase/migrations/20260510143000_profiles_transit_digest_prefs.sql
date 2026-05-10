-- Preferências para digest automático de trânsitos (invocação por cron externo / pg_cron / Edge).
ALTER TABLE public.profiles
  ADD COLUMN transit_digest_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN transit_digest_hour smallint NOT NULL DEFAULT 8,
  ADD COLUMN transit_digest_weekdays smallint[] NOT NULL DEFAULT ARRAY[1, 2, 3, 4, 5]::smallint[],
  ADD CONSTRAINT profiles_transit_digest_hour_chk CHECK (
    transit_digest_hour >= 0 AND transit_digest_hour <= 23
  );

COMMENT ON COLUMN public.profiles.transit_digest_weekdays IS
  'Dias preferidos no fuso America/Sao_Paulo: 0=domingo … 6=sábado (Date.getDay).';
