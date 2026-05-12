-- Mercado Pago Checkout Pro: pedidos e correlação por external_reference (webhook)
CREATE TABLE public.mercadopago_orders (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['mensal'::text, 'anual'::text])),
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL'::text,
  external_reference text NOT NULL,
  preference_id text,
  payment_id text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'approved'::text,
        'rejected'::text,
        'cancelled'::text,
        'refunded'::text
      ]
    )
  ),
  raw_last_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mercadopago_orders_external_reference_key UNIQUE (external_reference),
  CONSTRAINT mercadopago_orders_external_ref_matches_id CHECK (external_reference = id::text)
);

CREATE INDEX mercadopago_orders_user_id_created_at_idx ON public.mercadopago_orders (user_id, created_at DESC);

COMMENT ON TABLE public.mercadopago_orders IS 'Checkout Pro Mercado Pago; actualização via Edge Function mercadopago-webhook (service role).';

ALTER TABLE public.mercadopago_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own mercadopago_orders"
  ON public.mercadopago_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mercadopago_orders"
  ON public.mercadopago_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.mercadopago_orders TO authenticated;
