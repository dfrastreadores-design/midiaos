/**
 * Script SQL para inicialização e migração da tabela de Parceiros de Mídia no Supabase.
 * Pode ser copiado diretamente para o SQL Editor do painel do Supabase.
 */
export const SQL_PARCEIROS_SETUP = `-- ==============================================================================
-- INICIALIZAÇÃO DA TABELA DE PARCEIROS DE MÍDIA NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase (Dashboard -> SQL Editor -> Run)
-- ==============================================================================

-- 1. Criação da tabela de parceiros de mídia
CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  site TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  redes_sociais JSONB DEFAULT '{}',
  segmentos TEXT[] DEFAULT '{}',
  modelo_remuneracao TEXT DEFAULT 'comissao_percentual',
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  prazo_repasse TEXT,
  condicoes_comerciais TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  chave_pix TEXT,
  dados_bancarios TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Garantir colunas adicionais para instalações existentes
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais JSONB DEFAULT '{}';

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON public.parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_cnpj ON public.parceiros(cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiros_ativo ON public.parceiros(ativo);

-- 4. Vincular produtos aos parceiros
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_inquilino_pct NUMERIC(5,2);

CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);

-- 5. Permissões de acesso
GRANT ALL ON public.parceiros TO authenticated;
GRANT ALL ON public.parceiros TO service_role;
GRANT SELECT ON public.parceiros TO anon;

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- 7. Função e Trigger para preenchimento de tenant_id automático
CREATE OR REPLACE FUNCTION public.fn_parceiros_set_tenant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_parceiros_set_tenant ON public.parceiros;
CREATE TRIGGER trg_parceiros_set_tenant
  BEFORE INSERT ON public.parceiros
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_parceiros_set_tenant();

-- 8. Políticas de isolamento Multi-Tenant
DROP POLICY IF EXISTS "tenant_isolation_select_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_select_parceiros" ON public.parceiros
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_insert_parceiros" ON public.parceiros
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_update_parceiros" ON public.parceiros
  FOR UPDATE TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_delete_parceiros" ON public.parceiros
  FOR DELETE TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- 9. Tabela complementar: Anexos e Mídia Kits do Parceiro
CREATE TABLE IF NOT EXISTS public.parceiro_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo TEXT DEFAULT 'midia_kit',
  tamanho_bytes BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiro_anexos_parceiro ON public.parceiro_anexos(parceiro_id);
GRANT ALL ON public.parceiro_anexos TO authenticated;
GRANT ALL ON public.parceiro_anexos TO service_role;
ALTER TABLE public.parceiro_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos;
CREATE POLICY "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos
  FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- 10. Tabela complementar: Métricas e Defesas Técnicas de Mídia
CREATE TABLE IF NOT EXISTS public.parceiros_metricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  parceiro_nome TEXT NOT NULL,
  tipo_midia TEXT NOT NULL,
  veiculo_programa TEXT NOT NULL,
  praca TEXT DEFAULT 'Brasília - DF',
  alcance_estimado TEXT DEFAULT '',
  impactos_mes TEXT DEFAULT '',
  fluxo_diario TEXT DEFAULT '',
  perfil_publico TEXT DEFAULT 'Classes A, B e C, 25 a 55 anos',
  audiencia_share TEXT DEFAULT '',
  fonte_dados TEXT DEFAULT 'Kantar IBOPE / Auditoria de Tráfego',
  defesa_tecnica TEXT NOT NULL,
  destaques_comerciais JSONB DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_metricas_tenant ON public.parceiros_metricas(tenant_id);
GRANT ALL ON public.parceiros_metricas TO authenticated;
GRANT ALL ON public.parceiros_metricas TO service_role;
ALTER TABLE public.parceiros_metricas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas;
CREATE POLICY "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas
  FOR ALL TO authenticated
  USING (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    tenant_id IS NULL OR
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );

-- 11. Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
`;
