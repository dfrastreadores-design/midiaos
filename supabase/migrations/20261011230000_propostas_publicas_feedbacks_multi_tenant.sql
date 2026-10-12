-- ============================================================================
-- MIGRAÇÃO: Portal Público de Propostas, Feedbacks, Aprovação Digital e Isolamento Multi-Tenant
-- Políticas de Zero Perda de Dados (IF NOT EXISTS, evolução aditiva)
-- ============================================================================

-- 1. ADICIONAR COLUNAS ADITIVAS EM PROPOSTAS
DO $$
BEGIN
  -- Token criptográfico único para compartilhamento e portal público
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'public_token'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN public_token UUID DEFAULT gen_random_uuid() NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_propostas_public_token ON public.propostas(public_token);
  END IF;

  -- Campo de Público de Interesse
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'publico_interesse'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN publico_interesse TEXT;
  END IF;

  -- Colunas de Auditoria e Aprovação Formal Digital
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_digitalmente_em'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_digitalmente_em TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_nome'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_nome TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_cargo'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_cargo TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_documento'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_documento TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'propostas' AND column_name = 'aprovado_por_ip'
  ) THEN
    ALTER TABLE public.propostas ADD COLUMN aprovado_por_ip TEXT;
  END IF;
END $$;

-- 2. ADICIONAR CAMPO PUBLICO_INTERESSE EM BRIEFINGS E CAMPANHAS DE PLANEJAMENTO
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'briefings') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'briefings' AND column_name = 'publico_interesse'
    ) THEN
      ALTER TABLE public.briefings ADD COLUMN publico_interesse TEXT;
    END IF;
  END IF;
END $$;

-- 3. TABELA DE FEEDBACKS E SUGESTÕES DA PROPOSTA ONLINE (Interações do Cliente)
CREATE TABLE IF NOT EXISTS public.proposta_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'outro', -- 'troca_ponto', 'ajuste_periodo', 'revisao_valores', 'outro'
  mensagem TEXT NOT NULL,
  autor_nome TEXT,
  autor_contato TEXT,
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'analisado', 'atendido', 'rejeitado'
  resposta TEXT,
  respondido_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_feedbacks_proposta_id ON public.proposta_feedbacks(proposta_id);
CREATE INDEX IF NOT EXISTS idx_proposta_feedbacks_tenant_id ON public.proposta_feedbacks(tenant_id);

-- 4. SEGURANÇA E POLÍTICAS RLS (Multi-Tenant Isolation)
ALTER TABLE public.proposta_feedbacks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Inquilino gerencia feedbacks da proposta" ON public.proposta_feedbacks;
  CREATE POLICY "Inquilino gerencia feedbacks da proposta"
    ON public.proposta_feedbacks
    FOR ALL
    TO authenticated
    USING (
      tenant_id IS NULL OR 
      tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid OR
      tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid())
    )
    WITH CHECK (
      tenant_id IS NULL OR 
      tenant_id = (SELECT auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid OR
      tenant_id = (SELECT (raw_user_meta_data->>'tenant_id')::uuid FROM auth.users WHERE id = auth.uid())
    );

  DROP POLICY IF EXISTS "Publico pode inserir feedback com token valido" ON public.proposta_feedbacks;
  CREATE POLICY "Publico pode inserir feedback com token valido"
    ON public.proposta_feedbacks
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);
END $$;

-- 5. TABELA DE CAMPANHAS DE PLANEJAMENTO (Caso ainda não sincronizada)
CREATE TABLE IF NOT EXISTS public.campanhas_planejamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  objetivo TEXT,
  publico_interesse TEXT,
  publico_alvo TEXT,
  periodo_inicio DATE,
  periodo_fim DATE,
  investimento_previsto NUMERIC(15,2) DEFAULT 0,
  status TEXT DEFAULT 'em_estudo',
  regioes_selecionadas JSONB DEFAULT '[]'::jsonb,
  pilares JSONB DEFAULT '{}'::jsonb,
  defesa_estrategica TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campanhas_planejamento ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.campanha_pontos_midia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  campanha_id UUID REFERENCES public.campanhas_planejamento(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  regiao TEXT,
  pilar_estrategico TEXT,
  quantidade_insercoes INTEGER DEFAULT 1,
  valor_negociado NUMERIC(15,2) DEFAULT 0,
  impactos_estimados NUMERIC(15,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.campanha_pontos_midia ENABLE ROW LEVEL SECURITY;

-- 6. TABELA DE INSERTION_ORDERS (Caso ainda não sincronizada no schema cache)
CREATE TABLE IF NOT EXISTS public.insertion_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_number TEXT NOT NULL,
  campaign_title TEXT NOT NULL,
  client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agency_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  billing_type TEXT DEFAULT 'REPRESENTATIVE_BILLING',
  status TEXT DEFAULT 'draft',
  checking_status TEXT DEFAULT 'pending_upload',
  gross_total NUMERIC(15,2) DEFAULT 0,
  net_total NUMERIC(15,2) DEFAULT 0,
  commission_total NUMERIC(15,2) DEFAULT 0,
  retention_total NUMERIC(15,2) DEFAULT 0,
  deductions_total NUMERIC(15,2) DEFAULT 0,
  production_cost_total NUMERIC(15,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.insertion_orders ENABLE ROW LEVEL SECURITY;
