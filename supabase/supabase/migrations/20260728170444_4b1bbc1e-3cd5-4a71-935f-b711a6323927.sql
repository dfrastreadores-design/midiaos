
REVOKE ALL ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_material(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_projeto(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_material(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_projeto(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) TO authenticated, service_role;
