
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_pi_numero() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_proposta_numero() FROM PUBLIC, anon, authenticated;
