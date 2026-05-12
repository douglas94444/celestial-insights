-- SyncPay: dados de cobrança Pix (CPF e telefone só dígitos) + pedidos de cash-in
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS billing_cpf text,
  ADD COLUMN IF NOT EXISTS billing_phone text;

COMMENT ON COLUMN public.profiles.billing_cpf IS 'CPF apenas dígitos (11) para cash-in SyncPay.';
COMMENT ON COLUMN public.profiles.billing_phone IS 'Telefone apenas dígitos (10–11) para cash-in SyncPay.';

CREATE TABLE public.syncpay_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['mensal'::text, 'anual'::text])),
  amount numeric(12, 2) NOT NULL,
  currency text NOT NULL DEFAULT 'BRL'::text,
  syncpay_identifier text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (
    status = ANY (
      ARRAY[
        'pending'::text,
        'completed'::text,
        'failed'::text,
        'refunded'::text,
        'med'::text
      ]
    )
  ),
  raw_last_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT syncpay_orders_syncpay_identifier_key UNIQUE (syncpay_identifier)
);

CREATE INDEX syncpay_orders_user_id_created_at_idx ON public.syncpay_orders (user_id, created_at DESC);

COMMENT ON TABLE public.syncpay_orders IS 'Pedidos Pix SyncPay; actualização de status via Edge Function webhook (service role).';

ALTER TABLE public.syncpay_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own syncpay_orders"
  ON public.syncpay_orders FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own syncpay_orders"
  ON public.syncpay_orders FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.syncpay_orders TO authenticated;
