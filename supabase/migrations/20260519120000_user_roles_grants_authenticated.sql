-- PostgREST 403 / PG 42501: role authenticated precisa de SELECT em user_roles
-- para o cliente ler o próprio papel (ex.: useUserIsAdmin → /admin).
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
