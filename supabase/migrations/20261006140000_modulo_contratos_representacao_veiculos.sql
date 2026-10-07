-- ==============================================================================
-- MIGRATION: 20261006140000_modulo_contratos_representacao_veiculos.sql
-- DESCRIÇÃO: Módulo de Gestão de Contratos de Representação e Veículos
--            Inquilino Alvo: NEXO MÍDIA E REPRESENTAÇÃO LTDA (CNPJ: 68.279.031/0001-67)
-- DIRETRIZ: 100% Aditiva, Não-destrutiva, com Auditoria e Lixeira Automática
-- ==============================================================================

-- 1. View de compatibilidade / alias para parceiros_veiculos
CREATE OR REPLACE VIEW public.parceiros_veiculos AS
  SELECT * FROM public.parceiros;

-- 2. Tabela de Contratos de Representação Comercial com Veículos
CREATE TABLE IF NOT EXISTS public.contratos_representacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE RESTRICT,
  numero_contrato TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'enviado_assinatura', 'ativo', 'suspenso', 'rescindido', 'vencido')
  ),
  produtos_representados TEXT[] DEFAULT '{}',
  territorio TEXT NOT NULL DEFAULT 'Distrito Federal e Entorno',

  -- Modelos de Faturamento Habilitados
  permite_faturamento_centralizado_nexo BOOLEAN NOT NULL DEFAULT true,
  aliquota_imposto_nexo_percentual NUMERIC(5,2) NOT NULL DEFAULT 6.00,
  permite_faturamento_direto_parceiro BOOLEAN NOT NULL DEFAULT true,
  prazo_repasse_dias INTEGER NOT NULL DEFAULT 3,

  -- Regras de Remuneração (Fixa ou Gatilhos de Volume)
  tipo_comissao TEXT NOT NULL DEFAULT 'fixa' CHECK (
    tipo_comissao IN ('fixa', 'gatilho_volume')
  ),
  comissao_fixa_percentual NUMERIC(5,2),
  regras_gatilho JSONB DEFAULT '[
    {"faixa": 1, "de": 0, "ate": 30000, "comissao_percentual": 30.0},
    {"faixa": 2, "de": 30001, "ate": 70000, "comissao_percentual": 35.0},
    {"faixa": 3, "de": 70001, "ate": null, "comissao_percentual": 40.0}
  ]'::jsonb,

  -- Garantias de continuidade e blindagem
  garantia_comissao_pos_rescisao BOOLEAN NOT NULL DEFAULT true,
  comissao_sobre_renovacoes BOOLEAN NOT NULL DEFAULT true,
  vigencia_meses INTEGER NOT NULL DEFAULT 12,
  data_inicio DATE,
  data_fim DATE,
  conteudo_contrato_markdown TEXT,

  -- Auditoria e controle
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance para contratos_representacao
CREATE INDEX IF NOT EXISTS idx_contratos_rep_tenant_cnpj ON public.contratos_representacao(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_parceiro_id ON public.contratos_representacao(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_status ON public.contratos_representacao(status);
CREATE INDEX IF NOT EXISTS idx_contratos_rep_numero ON public.contratos_representacao(numero_contrato);

-- 3. Tabela de Pedidos de Faturamento Intermediados (Splits de Faturamento e Repasses)
CREATE TABLE IF NOT EXISTS public.pedidos_faturamento_intermediados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_representacao_id UUID NOT NULL REFERENCES public.contratos_representacao(id) ON DELETE CASCADE,
  tenant_cnpj TEXT NOT NULL DEFAULT '68.279.031/0001-67',
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  cliente_cnpj TEXT,
  modelo_faturamento TEXT NOT NULL CHECK (
    modelo_faturamento IN ('centralizado_nexo', 'direto_parceiro')
  ),
  valor_bruto NUMERIC(12,2) NOT NULL DEFAULT 0,
  aliquota_imposto_aplicada NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_imposto_retido NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual_comissao_aplicado NUMERIC(5,2) NOT NULL DEFAULT 0,
  valor_comissao_nexo NUMERIC(12,2) NOT NULL DEFAULT 0,
  valor_liquido_repasse_parceiro NUMERIC(12,2) NOT NULL DEFAULT 0,

  status_pagamento_cliente TEXT NOT NULL DEFAULT 'pendente' CHECK (
    status_pagamento_cliente IN ('pendente', 'pago', 'atrasado')
  ),
  status_repasse TEXT NOT NULL DEFAULT 'aguardando_cliente' CHECK (
    status_repasse IN ('aguardando_cliente', 'pronto_para_repasse', 'liquidado')
  ),
  data_recebimento_cliente DATE,
  data_repasse_efetuado DATE,
  chave_pix_comprovante TEXT,
  observacoes TEXT,

  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pedidos_faturamento_intermediados
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_contrato ON public.pedidos_faturamento_intermediados(contrato_representacao_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_tenant_cnpj ON public.pedidos_faturamento_intermediados(tenant_cnpj);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_pag ON public.pedidos_faturamento_intermediados(status_pagamento_cliente);
CREATE INDEX IF NOT EXISTS idx_pedidos_fat_status_rep ON public.pedidos_faturamento_intermediados(status_repasse);

-- 4. Habilitar RLS (Row Level Security)
ALTER TABLE public.contratos_representacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_faturamento_intermediados ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para contratos_representacao
DROP POLICY IF EXISTS "contratos_rep_select" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_select" ON public.contratos_representacao
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_insert" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_insert" ON public.contratos_representacao
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "contratos_rep_update" ON public.contratos_representacao;
CREATE POLICY "contratos_rep_update" ON public.contratos_representacao
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Políticas de RLS para pedidos_faturamento_intermediados
DROP POLICY IF EXISTS "pedidos_fat_select" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_select" ON public.pedidos_faturamento_intermediados
  FOR SELECT TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_insert" ON public.pedidos_faturamento_intermediados
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "pedidos_fat_update" ON public.pedidos_faturamento_intermediados;
CREATE POLICY "pedidos_fat_update" ON public.pedidos_faturamento_intermediados
  FOR UPDATE TO authenticated
  USING (
    tenant_cnpj = '68.279.031/0001-67'
    OR tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

-- Permissões para Service Role (Bypass total para funções server-side)
GRANT ALL ON public.contratos_representacao TO service_role;
GRANT ALL ON public.pedidos_faturamento_intermediados TO service_role;
GRANT SELECT ON public.parceiros_veiculos TO authenticated, service_role;

-- 5. Acoplamento de Triggers de Lixeira e Auditoria
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY['contratos_representacao', 'pedidos_faturamento_intermediados'];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    -- Trigger de lixeira automática se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
    END IF;

    -- Trigger de auditoria de alterações se a função existir
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON public.%I', t, t);
      EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.log_alteracao()', t, t);
    END IF;
  END LOOP;
END $$;
