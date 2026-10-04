-- ========================================================================
-- MÓDULO DE INDICADORES DE CLIENTES & COMISSÃO POR INDICAÇÃO (REPRESENTAÇÃO)
-- Permite cadastrar pessoas que indicam clientes, definindo percentual de remuneração
-- e chave PIX para repasse após o pagamento do contrato.
-- ========================================================================

-- 1. Tabela de Indicadores (Pessoas que indicam clientes)
CREATE TABLE IF NOT EXISTS public.indicadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  cpf_cnpj text,
  chave_pix text,
  tipo_chave_pix text DEFAULT 'cpf',
  banco_nome text,
  percentual_comissao_padrao numeric(5, 2) NOT NULL DEFAULT 5.00,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger de updated_at para indicadores
CREATE OR REPLACE TRIGGER set_indicadores_updated_at
  BEFORE UPDATE ON public.indicadores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_indicadores_tenant_id ON public.indicadores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_indicadores_nome ON public.indicadores(nome);

-- 2. Vincular indicador no cadastro de clientes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'indicador_id'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN indicador_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clientes' AND column_name = 'comissao_indicacao_pct'
  ) THEN
    ALTER TABLE public.clientes ADD COLUMN comissao_indicacao_pct numeric(5, 2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clientes_indicador_id ON public.clientes(indicador_id);

-- 3. Vincular indicador nas PIs e propostas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pis' AND column_name = 'indicador_id'
  ) THEN
    ALTER TABLE public.pis ADD COLUMN indicador_id uuid REFERENCES public.indicadores(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pis' AND column_name = 'comissao_indicador_pct'
  ) THEN
    ALTER TABLE public.pis ADD COLUMN comissao_indicador_pct numeric(5, 2);
  END IF;
END $$;

-- 4. Tabela de Comissões por Indicação (Geradas quando o cliente fecha e paga)
CREATE TABLE IF NOT EXISTS public.comissoes_indicacao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  indicador_id uuid NOT NULL REFERENCES public.indicadores(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  pi_id uuid REFERENCES public.pis(id) ON DELETE SET NULL,
  transacao_id uuid REFERENCES public.financeiro_transacoes(id) ON DELETE SET NULL,
  valor_base numeric(12, 2) NOT NULL DEFAULT 0.00,
  percentual numeric(5, 2) NOT NULL DEFAULT 5.00,
  valor_comissao numeric(12, 2) NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  pago_em timestamptz,
  comprovante_pagamento_url text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_tenant ON public.comissoes_indicacao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_indicador ON public.comissoes_indicacao(indicador_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_indicacao_status ON public.comissoes_indicacao(status);

-- 5. RLS (Row Level Security)
ALTER TABLE public.indicadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes_indicacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Indicadores tenant isolation policy" ON public.indicadores;
CREATE POLICY "Indicadores tenant isolation policy" ON public.indicadores
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Comissoes indicacao tenant isolation policy" ON public.comissoes_indicacao;
CREATE POLICY "Comissoes indicacao tenant isolation policy" ON public.comissoes_indicacao
  FOR ALL
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    ) OR public.is_super_admin(auth.uid())
  );
