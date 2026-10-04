-- ==============================================================================
-- MIGRATION: 20260929150000_financeiro_entradas_saidas.sql
-- DESCRIÇÃO: 
-- 1. Suporte a Mídias dinâmicas no cadastro de produtos (midia text)
-- 2. Módulo de Gestão Financeira Completa (Entradas, Saídas, Categorias e Fluxo de Caixa)
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Converte coluna midia de produtos para text (caso ainda seja enum) para permitir cadastro dinâmico
DO $$
BEGIN
  ALTER TABLE public.produtos ALTER COLUMN midia TYPE text USING midia::text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Tabela de Transações Financeiras (Entradas e Saídas da Empresa)
CREATE TABLE IF NOT EXISTS public.financeiro_transacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao text NOT NULL,
  categoria text NOT NULL,
  valor numeric(15,2) NOT NULL DEFAULT 0,
  data_competencia date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date NOT NULL DEFAULT CURRENT_DATE,
  data_pagamento date,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado', 'agendado')),
  forma_pagamento text DEFAULT 'PIX',
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
  pi_id uuid REFERENCES public.pis(id) ON DELETE SET NULL,
  comprovante_url text,
  recorrente boolean DEFAULT false,
  observacoes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_tenant ON public.financeiro_transacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_tipo ON public.financeiro_transacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_status ON public.financeiro_transacoes(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_vencimento ON public.financeiro_transacoes(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_financeiro_transacoes_categoria ON public.financeiro_transacoes(categoria);

-- Ativar RLS
ALTER TABLE public.financeiro_transacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS com isolamento por inquilino
DROP POLICY IF EXISTS "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_select_financeiro_transacoes" ON public.financeiro_transacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_insert_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_insert_financeiro_transacoes" ON public.financeiro_transacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_update_financeiro_transacoes" ON public.financeiro_transacoes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_delete_financeiro_transacoes" ON public.financeiro_transacoes;
CREATE POLICY "tenant_isolation_delete_financeiro_transacoes" ON public.financeiro_transacoes
  FOR DELETE TO authenticated
  USING (
    public.is_admin(auth.uid()) OR
    tenant_id IS NULL OR
    tenant_id = public.current_tenant_id()
  );

-- Gatilho de auditoria e proteção de lixeira
DROP TRIGGER IF EXISTS trg_audit_financeiro_transacoes ON public.financeiro_transacoes;
CREATE TRIGGER trg_audit_financeiro_transacoes
  AFTER INSERT OR UPDATE OR DELETE ON public.financeiro_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.log_alteracao();

DROP TRIGGER IF EXISTS trg_trash_financeiro_transacoes ON public.financeiro_transacoes;
CREATE TRIGGER trg_trash_financeiro_transacoes
  BEFORE DELETE ON public.financeiro_transacoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash();

-- Permissões
GRANT ALL ON public.financeiro_transacoes TO authenticated;
GRANT ALL ON public.financeiro_transacoes TO service_role;
