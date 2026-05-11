-- Novos valores do enum (transação separada de UPDATE/DEFAULT — PostgreSQL 55P04).
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'MENSAL';
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'ANUAL';
