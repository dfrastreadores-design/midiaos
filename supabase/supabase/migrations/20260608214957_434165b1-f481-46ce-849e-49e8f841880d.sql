INSERT INTO public.role_permissions (role, permission_key)
VALUES ('producao'::app_role, 'module.pi'), ('producao'::app_role, 'module.calendario')
ON CONFLICT DO NOTHING;