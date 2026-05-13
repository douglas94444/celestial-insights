-- A política "Admins can manage all roles" era FOR ALL (inclui SELECT) com USING (has_role(...)).
-- security_revokes retira EXECUTE de has_role a authenticated; ao avaliar SELECT o Postgres
-- ainda avalia essa política e a chamada a has_role falha com 42501 → 403 no PostgREST,
-- mesmo com GRANT SELECT na tabela e com a política "own roles" aplicável.
-- Separamos DML (admin) de SELECT: utilizadores autenticados leem só a própria linha sem has_role.

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Admins can insert user_roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update user_roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete user_roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));
