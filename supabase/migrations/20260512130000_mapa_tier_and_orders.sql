-- Tier MAPA: compra avulsa permanente do mapa natal (R$37)
ALTER TYPE public.subscription_tier ADD VALUE IF NOT EXISTS 'MAPA';

-- Pedidos de compra avulsa do mapa natal (SyncPay ou Mercado Pago)
CREATE TABLE public.mapa_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL'::text,
  payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['syncpay'::text, 'mercadopago'::text])),
  external_ref text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'completed'::text,
        'failed'::text,
        'refunded'::text
      ]
    )
  ),
  raw_last_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mapa_orders_external_ref_key UNIQUE (external_ref)
);

CREATE INDEX mapa_orders_user_id_created_at_idx ON public.mapa_orders (user_id, created_at DESC);

COMMENT ON TABLE public.mapa_orders IS 'Compras avulsas do mapa natal (R$37, permanentes); tier MAPA gravado no perfil após pagamento confirmado via webhook (service role).';

ALTER TABLE public.mapa_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own mapa_orders"
  ON public.mapa_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mapa_orders"
  ON public.mapa_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.mapa_orders TO authenticated;
