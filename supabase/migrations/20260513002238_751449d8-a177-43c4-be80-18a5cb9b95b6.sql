INSERT INTO public.user_roles (user_id, role)
VALUES ('95386d1f-3369-4c1b-949b-f1f8e0a48a37', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;