-- Após commit da migração que adiciona MENSAL/ANUAL ao enum.
UPDATE public.profiles
SET subscription_tier = 'MENSAL'
WHERE subscription_tier = 'FREE';

ALTER TABLE public.profiles
ALTER COLUMN subscription_tier SET DEFAULT 'MENSAL';
