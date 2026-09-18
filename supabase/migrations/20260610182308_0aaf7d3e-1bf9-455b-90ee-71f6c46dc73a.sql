INSERT INTO public.role_permissions (role, permission_key)
VALUES ('executivo', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;