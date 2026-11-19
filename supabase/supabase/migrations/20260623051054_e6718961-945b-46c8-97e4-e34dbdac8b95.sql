
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garante que o usuário consiga ler o próprio tenant (necessário para exibir a logo no AppShell)
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
CREATE POLICY "Usuario le seu proprio tenant"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));
