-- Grant permissions to parceiro_comercial for briefings
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Ensure parceiro_comercial doesn't have other module permissions by default
-- (They might have others if manually added, but here we define the standard)
DELETE FROM public.role_permissions 
WHERE role = 'parceiro_comercial' 
AND permission_key NOT IN ('module.briefings');
