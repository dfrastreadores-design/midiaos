
-- Tabela de emissoras (CNPJs emissores do PI)
CREATE TABLE public.emissoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX emissoras_tenant_idx ON public.emissoras(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emissoras TO authenticated;
GRANT ALL ON public.emissoras TO service_role;

ALTER TABLE public.emissoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant members can view emissoras" ON public.emissoras
  FOR SELECT USING (tenant_id = public.current_tenant_id());

CREATE POLICY "admin can manage emissoras" ON public.emissoras
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_emissoras_updated
  BEFORE UPDATE ON public.emissoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Novas colunas em pis
ALTER TABLE public.pis
  ADD COLUMN emissora_id UUID REFERENCES public.emissoras(id) ON DELETE SET NULL,
  ADD COLUMN sem_comissao BOOLEAN NOT NULL DEFAULT false;
