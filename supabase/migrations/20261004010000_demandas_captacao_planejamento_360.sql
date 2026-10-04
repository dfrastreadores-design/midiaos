-- ==============================================================================
-- MÍDIA.OS — RADAR DE EXPANSÃO E DEMANDAS DE CAPTAÇÃO 360°
-- Tabela para registrar pedidos de captação de pontos/parceiros quando uma
-- região solicitada pelo cliente ainda não possui inventário direto cadastrado.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.demandas_captacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  regiao_administrativa TEXT NOT NULL,
  tipo_midia TEXT NOT NULL, -- Ex: Painel LED, Outdoor, Elevador, Front Light, Rádio Local
  formato_desejado TEXT,
  pilar_360 TEXT, -- 'deslocamento', 'moradia', 'lazer_consumo', 'ativacao_eventos', 'digital'
  perfil_publico JSONB DEFAULT '{}'::jsonb, -- { classes: [], estilo_vida: [] }
  historico_sucesso JSONB DEFAULT '{}'::jsonb, -- { canais_passado: [], aprendizados: '' }
  sugestoes_prospeccao JSONB DEFAULT '[]'::jsonb, -- lista de entidades/empresas sugeridas para contato
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_prospeccao', 'parceiro_captado', 'cancelado')),
  contato_responsavel TEXT,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para performance e consultas analíticas
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_tenant ON public.demandas_captacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_regiao ON public.demandas_captacao(regiao_administrativa);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_status ON public.demandas_captacao(status);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_cliente ON public.demandas_captacao(cliente_id);
CREATE INDEX IF NOT EXISTS idx_demandas_captacao_created ON public.demandas_captacao(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.demandas_captacao ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "demandas_captacao_tenant_authenticated" ON public.demandas_captacao;
CREATE POLICY "demandas_captacao_tenant_authenticated"
  ON public.demandas_captacao
  FOR ALL
  TO authenticated
  USING (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr WHERE pr.id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IS NULL OR 
    tenant_id IN (
      SELECT pr.tenant_id FROM public.profiles pr WHERE pr.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "demandas_captacao_service_role" ON public.demandas_captacao;
CREATE POLICY "demandas_captacao_service_role"
  ON public.demandas_captacao
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.demandas_captacao IS 'Registros do Radar de Expansão 360° para busca ativa e prospecção de pontos/parceiros em regiões solicitadas pelo cliente';
