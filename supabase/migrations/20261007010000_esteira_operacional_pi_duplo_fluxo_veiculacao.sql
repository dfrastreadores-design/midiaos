-- ==============================================================================
-- MIGRATION: 20261007010000_esteira_operacional_pi_duplo_fluxo_veiculacao.sql
-- MÍDIA.OS: MODELAGEM ADITIVA DO DUPLO FLUXO DE PEDIDOS DE INSERÇÃO (PI)
-- E GATILHO DE VALIDAÇÃO DE VEICULAÇÃO OPERACIONAL / ATIVOS OOH
-- ==============================================================================

-- 1. EVOLUÇÃO ADITIVA DA TABELA public.pis
-- ------------------------------------------------------------------------------
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tipo_pi TEXT DEFAULT 'CLIENTE', -- 'CLIENTE' | 'PARCEIRO'
  ADD COLUMN IF NOT EXISTS numero_pi TEXT,
  ADD COLUMN IF NOT EXISTS emissor_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS destinatario_id UUID,
  ADD COLUMN IF NOT EXISTS valor_bruto NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_comissao_agencia NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS percentual_desconto_inquilino NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_abatimentos NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status_veiculacao TEXT DEFAULT 'aguardando_pi', -- 'aguardando_pi' | 'veiculacao_autorizada' | 'em_veiculacao' | 'veiculado'
  ADD COLUMN IF NOT EXISTS data_emissao TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pis_proposta_id ON public.pis(proposta_id);
CREATE INDEX IF NOT EXISTS idx_pis_tipo_pi ON public.pis(tipo_pi);
CREATE INDEX IF NOT EXISTS idx_pis_destinatario_id ON public.pis(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_pis_emissor_id ON public.pis(emissor_id);
CREATE INDEX IF NOT EXISTS idx_pis_status_veiculacao ON public.pis(status_veiculacao);

-- Sincronizar numero_pi com numero onde nulo
UPDATE public.pis
SET numero_pi = numero
WHERE numero_pi IS NULL;

-- 2. EVOLUÇÃO ADITIVA DA TABELA public.pi_itens
-- ------------------------------------------------------------------------------
ALTER TABLE public.pi_itens
  ADD COLUMN IF NOT EXISTS ativo_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS periodo_veiculacao JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS valor_unitario_tabela NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_unitario_negociado NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_liquido_item NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abatimentos_item NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pi_itens_ativo_id ON public.pi_itens(ativo_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_produto_id ON public.pi_itens(produto_id);
CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_id ON public.pi_itens(parceiro_id);

-- 3. EVOLUÇÃO ADITIVA DA TABELA public.produtos (ATIVOS / PONTOS / FACES OOH)
-- ------------------------------------------------------------------------------
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS status_operacional TEXT DEFAULT 'disponivel', -- 'disponivel' | 'reservado' | 'bloqueado_comercial' | 'em_veiculacao'
  ADD COLUMN IF NOT EXISTS pi_ativo_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposta_ativa_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_status_operacional ON public.produtos(status_operacional);
CREATE INDEX IF NOT EXISTS idx_produtos_pi_ativo_id ON public.produtos(pi_ativo_id);

-- 4. VIEWS DE COMPATIBILIDADE PARA pedidos_insercao E pedidos_insercao_itens
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.pedidos_insercao AS
SELECT 
  id,
  tenant_id,
  proposta_id,
  COALESCE(tipo_pi, 'CLIENTE') AS tipo_pi,
  COALESCE(numero_pi, numero) AS numero_pi,
  COALESCE(emissor_id, tenant_id) AS emissor_id,
  COALESCE(destinatario_id, CASE WHEN tipo_pi = 'PARCEIRO' THEN parceiro_id ELSE COALESCE(agencia_id, cliente_id) END) AS destinatario_id,
  COALESCE(valor_bruto, valor_tabela, valor_negociado, 0) AS valor_bruto,
  COALESCE(percentual_comissao_agencia, 0) AS percentual_comissao_agencia,
  COALESCE(percentual_desconto_inquilino, 0) AS percentual_desconto_inquilino,
  COALESCE(valor_abatimentos, valor_desconto, 0) AS valor_abatimentos,
  COALESCE(valor_liquido, valor_negociado, 0) AS valor_liquido,
  CASE 
    WHEN UPPER(status::text) IN ('RASCUNHO') THEN 'RASCUNHO'
    WHEN UPPER(status::text) IN ('CANCELADO', 'REPROVADO') THEN 'CANCELADO'
    WHEN UPPER(status::text) IN ('APROVADO', 'ASSINADO', 'VEICULADO', 'FATURADO', 'FINALIZADO') THEN 'APROVADO'
    ELSE 'EMITIDO'
  END AS status,
  status_veiculacao,
  COALESCE(data_emissao, created_at) AS data_emissao,
  periodo_inicio,
  periodo_fim,
  cliente_id,
  agencia_id,
  parceiro_id,
  pi_pai_id,
  campanha,
  observacao,
  created_at,
  updated_at
FROM public.pis;

CREATE OR REPLACE VIEW public.pedidos_insercao_itens AS
SELECT
  id,
  pi_id AS pedido_insercao_id,
  COALESCE(ativo_id, produto_id) AS ativo_id,
  COALESCE(produto_id, ativo_id) AS produto_id,
  parceiro_id,
  periodo_veiculacao,
  COALESCE(valor_unitario_tabela, valor_tabela, valor_unit, 0) AS valor_unitario_tabela,
  COALESCE(valor_unitario_negociado, valor_negociado, valor_unit, 0) AS valor_unitario_negociado,
  COALESCE(valor_liquido_item, repasse_valor, valor_negociado, 0) AS valor_liquido_item,
  COALESCE(abatimentos_item, comissao_valor, 0) AS abatimentos_item,
  tipo,
  programa,
  formato,
  total_insercoes,
  created_at
FROM public.pi_itens;

GRANT SELECT ON public.pedidos_insercao TO authenticated, service_role;
GRANT SELECT ON public.pedidos_insercao_itens TO authenticated, service_role;

-- 5. GATILHO DE PROTEÇÃO E VALIDAÇÃO DE VEICULAÇÃO DO ATIVO
-- ------------------------------------------------------------------------------
-- Regra: Um ativo de mídia só pode transicionar para 'em_veiculacao' se houver um PI emitido.
CREATE OR REPLACE FUNCTION public.validar_status_veiculacao_ativo()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_pi_status TEXT;
BEGIN
  -- Se estiver tentando colocar o ativo em veiculação
  IF NEW.status_operacional = 'em_veiculacao' THEN
    IF NEW.pi_ativo_id IS NULL THEN
      -- Se não tem PI vinculado, reverte para bloqueado comercial
      NEW.status_operacional := 'bloqueado_comercial';
    ELSE
      SELECT status::text INTO v_pi_status
      FROM public.pis
      WHERE id = NEW.pi_ativo_id;

      IF v_pi_status IS NULL OR LOWER(v_pi_status) IN ('rascunho', 'cancelado', 'reprovado') THEN
        -- PI ainda não emitido / aprovado oficialmente
        NEW.status_operacional := 'bloqueado_comercial';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_status_veiculacao_ativo ON public.produtos;
CREATE TRIGGER trg_validar_status_veiculacao_ativo
BEFORE INSERT OR UPDATE OF status_operacional, pi_ativo_id ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.validar_status_veiculacao_ativo();

-- 6. REFORÇO DE POLÍTICA RLS PARA SEGURANÇA E ISOLAMENTO DE PARCEIROS
-- ------------------------------------------------------------------------------
-- O parceiro só tem acesso ao seu próprio PI e seus próprios itens
DROP POLICY IF EXISTS "pis_partner_isolation" ON public.pis;
CREATE POLICY "pis_partner_isolation" ON public.pis
FOR SELECT TO authenticated
USING (
  public.is_master_user()
  OR (
    -- Usuário parceiro autenticado pelo CNPJ só vê os seus próprios PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND parceiro_id IN (SELECT id FROM public.parceiros WHERE cnpj = public.get_current_user_cnpj())
  )
  OR (
    -- Clientes e agências continuam acessando seus respectivos PIs
    public.get_current_user_cnpj() IS NOT NULL
    AND (
      cliente_id IN (SELECT id FROM public.clientes WHERE cnpj = public.get_current_user_cnpj())
      OR agencia_id IN (SELECT id FROM public.agencias WHERE cnpj = public.get_current_user_cnpj())
    )
  )
  OR (
    -- Inquilino / Administradores sem vínculo exclusivo de CNPJ parceiro
    public.get_current_user_cnpj() IS NULL
    AND (tenant_id = public.current_user_tenant_id() OR tenant_id IS NULL)
  )
);
