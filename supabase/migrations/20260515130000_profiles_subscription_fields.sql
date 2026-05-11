-- Add subscription tracking columns used by payment webhook (Mercado Pago).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_id        text,
  ADD COLUMN IF NOT EXISTS subscription_provider  text,
  ADD COLUMN IF NOT EXISTS subscription_expires_at timestamptz;

-- Prevent authenticated users from self-updating subscription fields.
-- Only the service-role key (used by payment webhooks) can change these columns.
-- The existing row-level UPDATE policy stays; this adds column-level restriction.
REVOKE UPDATE (subscription_tier, subscription_id, subscription_provider, subscription_expires_at)
  ON public.profiles
  FROM authenticated;
