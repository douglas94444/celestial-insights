-- Métricas agregadas só para utilizadores com papel admin em user_roles.
-- has_role já existe (SECURITY DEFINER); EXECUTE continua revogado ao cliente — esta função encapsula a verificação.
-- Primeiro admin: INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin');

CREATE OR REPLACE FUNCTION public.admin_overview_metrics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso reservado a administradores.'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'profiles_count', (SELECT count(*)::int FROM public.profiles),
    'charts_count', (SELECT count(*)::int FROM public.charts),
    'synastries_count', (SELECT count(*)::int FROM public.synastries),
    'mood_logs_count', (SELECT count(*)::int FROM public.mood_logs),
    'ai_cache_count', (SELECT count(*)::int FROM public.interpretation_ai_cache),
    'engagement_events_total', (SELECT count(*)::int FROM public.user_engagement_events),
    'engagement_events_last_7d', (
      SELECT count(*)::int
      FROM public.user_engagement_events
      WHERE created_at >= (now() AT TIME ZONE 'utc') - interval '7 days'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_overview_metrics() TO authenticated;

COMMENT ON FUNCTION public.admin_overview_metrics() IS
  'Painel admin: contagens globais. Apenas auth.uid() com role admin em user_roles.';
