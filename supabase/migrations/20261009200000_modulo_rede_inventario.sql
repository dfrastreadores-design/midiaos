-- ==============================================================================
-- MIGRATION: 20261009200000_modulo_rede_inventario.sql
-- DESCRIÇÃO: Novo Módulo de Rede de Inventário do Mídia.OS:
--            - public.rede_inventario (Origem de Inventário: Próprio vs Representado)
--            - Suporte a nome interno, nome comercial, empresa, cnpj, contato,
--              contrato, comissao e status
--            - Relacionamento com produtos existentes em public.produtos
-- DIRETRIZ: ADITIVA E RETROCOMPATÍVEL (ZERO PERDA DE DADOS)
-- ==============================================================================

-- 1. Criação da tabela principal de origens da Rede de Inventário
CREATE TABLE IF NOT EXISTS public.rede_inventario (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tipo_origem TEXT NOT NULL CHECK (tipo_origem IN ('PROPRIO', 'REPRESENTADO')) DEFAULT 'REPRESENTADO',
  nome_interno TEXT NOT NULL,
  nome_comercial TEXT NOT NULL,
  empresa TEXT,
  cnpj TEXT,
  contato TEXT,
  contrato TEXT,
  comissao NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  status TEXT NOT NULL CHECK (status IN ('ativo', 'inativo', 'em_negociacao')) DEFAULT 'ativo',
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já tenha sido criada previamente
ALTER TABLE public.rede_inventario
  ADD COLUMN IF NOT EXISTS tipo_origem TEXT NOT NULL DEFAULT 'REPRESENTADO',
  ADD COLUMN IF NOT EXISTS nome_interno TEXT,
  ADD COLUMN IF NOT EXISTS nome_comercial TEXT,
  ADD COLUMN IF NOT EXISTS empresa TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS contato TEXT,
  ADD COLUMN IF NOT EXISTS contrato TEXT,
  ADD COLUMN IF NOT EXISTS comissao NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_rede_inventario_tenant ON public.rede_inventario(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_tipo ON public.rede_inventario(tipo_origem);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_status ON public.rede_inventario(status);
CREATE INDEX IF NOT EXISTS idx_rede_inventario_cnpj ON public.rede_inventario(cnpj);

-- 3. Relacionamento com a tabela public.produtos (Aditivo e retrocompatível)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'produtos'
  ) THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS rede_inventario_id UUID REFERENCES public.rede_inventario(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS tipo_origem_inventario TEXT DEFAULT 'PROPRIO';

    CREATE INDEX IF NOT EXISTS idx_produtos_rede_inventario ON public.produtos(rede_inventario_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_tipo_origem ON public.produtos(tipo_origem_inventario);
  END IF;
END $$;

-- 4. Migração e Sincronização Segura de Dados Existentes
-- Transfere registros da tabela parceiros legada para a rede de inventário sem apagar nada
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'parceiros'
  ) THEN
    -- Inserir nós representados correspondentes a parceiros existentes
    INSERT INTO public.rede_inventario (
      id,
      tenant_id,
      tipo_origem,
      nome_interno,
      nome_comercial,
      empresa,
      cnpj,
      contato,
      contrato,
      comissao,
      status,
      created_at,
      updated_at
    )
    SELECT 
      p.id,
      p.tenant_id,
      'REPRESENTADO' AS tipo_origem,
      p.razao_social AS nome_interno,
      COALESCE(NULLIF(p.nome_fantasia, ''), p.razao_social) AS nome_comercial,
      p.razao_social AS empresa,
      p.cnpj,
      COALESCE(
        NULLIF(p.contato_nome, ''), 
        NULLIF(p.contato_email, ''), 
        NULLIF(p.contato_telefone, ''), 
        'Contato Comercial'
      ) AS contato,
      COALESCE(p.condicoes_comerciais, 'Contrato de Representação Padrão') AS contrato,
      COALESCE(p.comissao_padrao_pct, 20.00) AS comissao,
      CASE WHEN p.ativo = false THEN 'inativo' ELSE 'ativo' END AS status,
      p.created_at,
      p.updated_at
    FROM public.parceiros p
    ON CONFLICT (id) DO NOTHING;

    -- Conectar produtos que possuem parceiro_id ao seu nó na rede de inventário
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'produtos' AND column_name = 'parceiro_id'
    ) THEN
      UPDATE public.produtos
      SET rede_inventario_id = parceiro_id,
          tipo_origem_inventario = 'REPRESENTADO'
      WHERE parceiro_id IS NOT NULL AND rede_inventario_id IS NULL;
    END IF;
  END IF;
END $$;

-- 5. Trigger de atualização de timestamp
CREATE OR REPLACE FUNCTION public.trg_rede_inventario_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rede_inventario_update ON public.rede_inventario;
CREATE TRIGGER trg_rede_inventario_update
  BEFORE UPDATE ON public.rede_inventario
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_rede_inventario_updated_at();

-- 6. RLS (Row Level Security)
ALTER TABLE public.rede_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rede_inventario_select_policy" ON public.rede_inventario;
CREATE POLICY "rede_inventario_select_policy" ON public.rede_inventario
  FOR SELECT
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

DROP POLICY IF EXISTS "rede_inventario_all_policy" ON public.rede_inventario;
CREATE POLICY "rede_inventario_all_policy" ON public.rede_inventario
  FOR ALL
  USING (
    tenant_id IS NULL 
    OR tenant_id = (current_setting('app.current_tenant_id', true))::uuid
    OR (auth.jwt() ->> 'app_tenant_id')::uuid = tenant_id
    OR current_user = 'service_role'
    OR current_user = 'postgres'
  );

COMMENT ON TABLE public.rede_inventario IS 'Origens do inventário do Mídia.OS (Inventário Próprio vs Representado) com controle comercial e operacional blindado.';
