INSERT INTO public.role_permissions (role, permission_key)
VALUES ('admin', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;