-- Lembrete por email «Momento de hoje» (cron no servidor; usa hora/dias do digest se configurados)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS moment_daily_email boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.moment_daily_email IS
  'Quando true e email_notifications, envio opcional de lembrete Momento no mesmo slot que transit_digest_hour/weekdays (America/Sao_Paulo).';
