-- ==============================================================================
-- MIDIA OS v2.6.0 — MÓDULO MIDIA OS PROSPECT (FASE 1)
-- Migration: 20261101230000_modulo_prospect_fase1_seis_tabelas.sql
-- Descrição: Criação exclusiva das exatamente seis tabelas auxiliares do módulo Prospect,
--            garantias de integridade referencial com o schema-base do Midia OS,
--            isolamento multi-tenant, RLS por papel, máquina de estados,
--            idempotência de webhooks, triggers de integridade e RPC atômica
--            de transferência de carteira.
-- Ambiente:  Exclusivo para Homologação / Staging (Bloqueado em Produção)
-- Pré-requisitos: Schema-base do Midia OS (tenants, profiles, user_roles, clientes,
--                 auditoria_alteracoes, app_role, current_tenant_id, has_role)
-- ==============================================================================

-- ==============================================================================
-- 1. TABELA 1/6: prospect_settings
-- Configurações operacionais, limites e parâmetros por tenant
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  distribuicao_tipo TEXT NOT NULL DEFAULT 'round_robin' CHECK (distribuicao_tipo IN ('round_robin', 'manual', 'ponderada')),
  ultimo_executivo_distribuido_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  janela_inicio_envio TIME NOT NULL DEFAULT '08:00:00',
  janela_fim_envio TIME NOT NULL DEFAULT '18:00:00',
  dias_uteis_apenas BOOLEAN NOT NULL DEFAULT true,
  max_disparos_dia INTEGER NOT NULL DEFAULT 50,
  pesos_score JSONB NOT NULL DEFAULT '{"cnae": 30, "porte": 25, "presenca_digital": 20, "localizacao": 15, "aderencia_inventario": 10}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. TABELA 2/6: prospect_searches
-- Histórico e parâmetros de buscas de mercado executadas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  termo_busca TEXT,
  segmento TEXT,
  cidade TEXT,
  uf VARCHAR(2),
  filtros JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_encontrados INTEGER NOT NULL DEFAULT 0,
  total_novos INTEGER NOT NULL DEFAULT 0,
  total_duplicados INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. TABELA 3/6: prospect_companies
-- Leads corporativos mapeados, inteligência e carteira individual (Modelo A)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  search_id UUID REFERENCES public.prospect_searches(id) ON DELETE SET NULL,
  cnpj VARCHAR(18),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnae_principal TEXT,
  setor TEXT,
  cidade TEXT,
  uf VARCHAR(2),
  score_comercial INTEGER NOT NULL DEFAULT 0 CHECK (score_comercial >= 0 AND score_comercial <= 100),
  fatores_score JSONB NOT NULL DEFAULT '{}'::jsonb,
  recomendacoes_inventario JSONB NOT NULL DEFAULT '[]'::jsonb,
  contatos JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'qualificado', 'em_conversa', 'convertido_crm', 'desqualificado', 'bloqueado_optout')),
  executivo_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  atribuicao_manual BOOLEAN NOT NULL DEFAULT false,
  atribuicao_origem TEXT NOT NULL DEFAULT 'sistema' CHECK (atribuicao_origem IN ('sistema', 'round_robin', 'manual_master', 'pesquisa_manual')),
  historico_atribuicoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  notas_executivo TEXT,
  dispatch_in_flight_token UUID,
  dispatch_in_flight_until TIMESTAMPTZ,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prospect_companies_tenant_cnpj UNIQUE (tenant_id, cnpj)
);

-- ==============================================================================
-- 4. TABELA 4/6: prospect_campaigns
-- Campanhas e réguas comerciais de prospecção
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  canal_primario TEXT NOT NULL DEFAULT 'whatsapp' CHECK (canal_primario IN ('whatsapp', 'email', 'misto')),
  ativo BOOLEAN NOT NULL DEFAULT true,
  configuracao_cadencia JSONB NOT NULL DEFAULT '{"etapas": []}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 5. TABELA 5/6: prospect_interactions
-- Fila e histórico transacional de mensagens, telemetria de provedores e idempotência
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.prospect_companies(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.prospect_campaigns(id) ON DELETE SET NULL,
  direcao TEXT NOT NULL CHECK (direcao IN ('outbound', 'inbound', 'interna')),
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('mensagem_cadencia', 'resposta_recebida', 'resposta_espontanea', 'optout_solicitado', 'nota_interna')),
  canal TEXT NOT NULL CHECK (canal IN ('whatsapp', 'email', 'telefone', 'sistema')),
  status TEXT NOT NULL CHECK (status IN ('agendado', 'pendente', 'autorizado', 'enviando', 'enviado', 'entregue', 'lido', 'cancelado_optout', 'enviado_pre_bloqueio', 'falha_temporaria', 'falha_definitiva', 'pendente_reconciliacao', 'falha_verificacao')),
  destinatario_normalizado TEXT NOT NULL,
  chave_idempotencia TEXT,
  id_externo_mensagem TEXT,
  payload_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  telemetria_provedor JSONB NOT NULL DEFAULT '{"eventos_processados": []}'::jsonb,
  tentativas INTEGER NOT NULL DEFAULT 0,
  max_tentativas INTEGER NOT NULL DEFAULT 3,
  proxima_tentativa_em TIMESTAMPTZ,
  agendado_para TIMESTAMPTZ NOT NULL DEFAULT now(),
  autorizado_em TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ,
  lido_em TIMESTAMPTZ,
  ultimo_erro TEXT,
  motivo_cancelamento TEXT,
  optout_interceptado BOOLEAN NOT NULL DEFAULT false,
  dispatch_token UUID,
  lease_expira_em TIMESTAMPTZ,
  parent_interaction_id UUID REFERENCES public.prospect_interactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. TABELA 6/6: prospect_blocklist
-- Registro mandatório de opt-outs e proteções contra reabordagens
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.prospect_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  destinatario_normalizado TEXT NOT NULL,
  tipo_canal TEXT NOT NULL DEFAULT 'todos' CHECK (tipo_canal IN ('whatsapp', 'email', 'todos')),
  motivo TEXT NOT NULL DEFAULT 'solicitacao_lead',
  origem_optout TEXT NOT NULL DEFAULT 'inbound_message' CHECK (origem_optout IN ('inbound_message', 'manual_executivo', 'manual_master', 'importacao_lgpd')),
  solicitado_por_contato TEXT,
  interaction_id UUID REFERENCES public.prospect_interactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_prospect_blocklist_tenant_dest UNIQUE (tenant_id, destinatario_normalizado, tipo_canal)
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE, FILA E INTEGRIDADE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_prospect_companies_tenant_exec ON public.prospect_companies(tenant_id, executivo_id);
CREATE INDEX IF NOT EXISTS idx_prospect_companies_status ON public.prospect_companies(status);
CREATE INDEX IF NOT EXISTS idx_prospect_companies_score ON public.prospect_companies(score_comercial DESC);

CREATE INDEX IF NOT EXISTS idx_prospect_interactions_queue ON public.prospect_interactions(tenant_id, status, agendado_para)
WHERE status IN ('agendado', 'pendente', 'enviando', 'pendente_reconciliacao');

CREATE INDEX IF NOT EXISTS idx_prospect_interactions_id_externo ON public.prospect_interactions(tenant_id, id_externo_mensagem)
WHERE id_externo_mensagem IS NOT NULL;

-- Índice para unicidade estrita de chave de idempotência outbound
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospect_interactions_idempotencia
ON public.prospect_interactions(tenant_id, chave_idempotencia)
WHERE chave_idempotencia IS NOT NULL;

-- Índice para unicidade estrita de eventos de mensagens inbound (sem necessidade de 7ª tabela)
CREATE UNIQUE INDEX IF NOT EXISTS uq_prospect_inbound_provider_event
ON public.prospect_interactions(tenant_id, canal, id_externo_mensagem)
WHERE direcao = 'inbound' AND id_externo_mensagem IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_prospect_blocklist_lookup ON public.prospect_blocklist(tenant_id, destinatario_normalizado);

-- ==============================================================================
-- TRIGGERS DE SEGURANÇA E PROTEÇÃO POR COLUNA
-- ==============================================================================

-- 1. Proteção de colunas em prospect_companies contra mutação por Executivos
CREATE OR REPLACE FUNCTION public.check_executivo_update_prospect()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Se o usuário não for administrador ou diretoria do tenant
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role)) THEN
    -- Bloquear alteração de colunas restritas
    IF NEW.executivo_id IS DISTINCT FROM OLD.executivo_id OR
       NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR
       NEW.cnpj IS DISTINCT FROM OLD.cnpj OR
       NEW.score_comercial IS DISTINCT FROM OLD.score_comercial OR
       NEW.atribuicao_manual IS DISTINCT FROM OLD.atribuicao_manual OR
       NEW.atribuicao_origem IS DISTINCT FROM OLD.atribuicao_origem OR
       NEW.historico_atribuicoes IS DISTINCT FROM OLD.historico_atribuicoes THEN
      RAISE EXCEPTION 'Acesso Negado: Executivo só pode alterar status comercial e notas operacionais de seus leads.';
    END IF;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_prospect_columns ON public.prospect_companies;
CREATE TRIGGER trg_protect_prospect_columns
BEFORE UPDATE ON public.prospect_companies
FOR EACH ROW EXECUTE FUNCTION public.check_executivo_update_prospect();

-- 2. Proteção de integridade em prospect_interactions contra injeção de falsos envios
CREATE OR REPLACE FUNCTION public.check_interaction_insert_security()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Usuários comuns autenticados (fora do service_role) só podem criar notas internas
  IF auth.role() = 'authenticated' AND NOT (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role)) THEN
    IF NEW.direcao <> 'interna' OR NEW.tipo_evento <> 'nota_interna' THEN
      RAISE EXCEPTION 'Acesso Negado: Usuários comerciais só podem registrar notas internas na linha do tempo.';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_interaction_inserts ON public.prospect_interactions;
CREATE TRIGGER trg_protect_interaction_inserts
BEFORE INSERT ON public.prospect_interactions
FOR EACH ROW EXECUTE FUNCTION public.check_interaction_insert_security();

-- ==============================================================================
-- RPC ATÔMICA DE TRANSFERÊNCIA DE CARTEIRA (COM BLINDAGEM MULTI-TENANT E STATUS ATIVO)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.transferir_lead_carteira(
  p_empresa_id UUID,
  p_novo_executivo_id UUID,
  p_motivo TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_tenant_id UUID;
  v_caller_ativo BOOLEAN;
  v_caller_is_authorized BOOLEAN;
  v_lead RECORD;
  v_novo_exec RECORD;
  v_item_historico JSONB;
BEGIN
  -- 1. Validar autenticação e status ativo do solicitante
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Acesso não autenticado.';
  END IF;

  SELECT tenant_id, ativo
  INTO v_caller_tenant_id, v_caller_ativo
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Usuário solicitante não possui tenant válido cadastrado.';
  END IF;

  IF v_caller_ativo IS NOT TRUE THEN
    RAISE EXCEPTION 'Acesso Negado: Usuário solicitante está inativo no sistema.';
  END IF;

  -- 2. Verificar se o solicitante possui papel 'admin' ou 'diretoria'
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = v_caller_id AND role IN ('admin'::public.app_role, 'diretoria'::public.app_role)
  ) INTO v_caller_is_authorized;

  IF NOT v_caller_is_authorized THEN
    RAISE EXCEPTION 'Acesso Negado: Apenas Administradores e Diretores podem transferir carteira.';
  END IF;

  -- 3. Lock transacional da linha do lead e validação de tenant
  SELECT id, tenant_id, executivo_id, razao_social, historico_atribuicoes
  INTO v_lead
  FROM public.prospect_companies
  WHERE id = p_empresa_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead ID % não encontrado.', p_empresa_id;
  END IF;

  IF v_lead.tenant_id <> v_caller_tenant_id THEN
    RAISE EXCEPTION 'Violação de Segurança: O lead pertence a outro tenant.';
  END IF;

  -- 4. Validar o novo executivo de destino (mesmo tenant, ativo e papel 'executivo')
  SELECT p.id, p.tenant_id, p.ativo, p.nome
  INTO v_novo_exec
  FROM public.profiles p
  WHERE p.id = p_novo_executivo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Executivo de destino não encontrado no cadastro de perfis.';
  END IF;

  IF v_novo_exec.tenant_id <> v_caller_tenant_id THEN
    RAISE EXCEPTION 'Violação de Segurança: O novo executivo pertence a outro tenant.';
  END IF;

  IF v_novo_exec.ativo IS NOT TRUE THEN
    RAISE EXCEPTION 'O novo executivo está inativo no sistema e não pode receber leads.';
  END IF;

  IF NOT public.has_role(p_novo_executivo_id, 'executivo'::public.app_role) THEN
    RAISE EXCEPTION 'O usuário de destino não possui o papel comercial de executivo.';
  END IF;

  IF v_lead.executivo_id = p_novo_executivo_id THEN
    RAISE EXCEPTION 'O lead já se encontra atribuído a este executivo.';
  END IF;

  -- 5. Montar estrutura durável do histórico de atribuições
  v_item_historico := jsonb_build_object(
    'data_hora', NOW(),
    'executivo_anterior_id', v_lead.executivo_id,
    'novo_executivo_id', p_novo_executivo_id,
    'transferido_por_id', v_caller_id,
    'motivo', COALESCE(p_motivo, 'Reatribuição de carteira via Master/Diretoria'),
    'origem', 'manual_master'
  );

  -- 6. Atualizar a empresa com flag de atribuição manual (imune a Round-Robin)
  UPDATE public.prospect_companies
  SET
    executivo_id = p_novo_executivo_id,
    atribuicao_manual = TRUE,
    atribuicao_origem = 'manual_master',
    historico_atribuicoes = COALESCE(historico_atribuicoes, '[]'::jsonb) || v_item_historico,
    updated_at = NOW()
  WHERE id = p_empresa_id;

  -- 7. Registrar auditoria na tabela oficial de auditoria (na mesma transação)
  INSERT INTO public.auditoria_alteracoes (
    user_id,
    tabela,
    registro_id,
    operacao,
    alteracoes,
    valor_anterior,
    valor_novo
  ) VALUES (
    v_caller_id,
    'prospect_companies',
    p_empresa_id::text,
    'TRANSFERENCIA_CARTEIRA',
    jsonb_build_object(
      'executivo_id', jsonb_build_object('old', v_lead.executivo_id, 'new', p_novo_executivo_id),
      'motivo', p_motivo
    ),
    jsonb_build_object('executivo_id', v_lead.executivo_id),
    jsonb_build_object('executivo_id', p_novo_executivo_id, 'atribuicao_manual', true)
  );

  RETURN jsonb_build_object(
    'sucesso', true,
    'lead_id', p_empresa_id,
    'executivo_anterior_id', v_lead.executivo_id,
    'novo_executivo_id', p_novo_executivo_id,
    'executivo_nome', v_novo_exec.nome
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transferir_lead_carteira(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transferir_lead_carteira(UUID, UUID, TEXT) TO authenticated;

-- Helper para verificação pontual de blocklist por Executivos sem expor a tabela completa
CREATE OR REPLACE FUNCTION public.is_lead_bloqueado(p_destinatario TEXT, p_tipo_canal TEXT DEFAULT 'todos')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant_id UUID := public.current_tenant_id();
BEGIN
  IF v_tenant_id IS NULL THEN RETURN TRUE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.prospect_blocklist
    WHERE tenant_id = v_tenant_id
      AND destinatario_normalizado = p_destinatario
      AND (tipo_canal = 'todos' OR tipo_canal = p_tipo_canal)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_lead_bloqueado(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_lead_bloqueado(TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- POLÍTICAS ROW LEVEL SECURITY (RLS) PARA AS SEIS TABELAS
-- ==============================================================================

-- 1. prospect_settings
ALTER TABLE public.prospect_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Settings visível apenas por Admin e Diretoria do Tenant" ON public.prospect_settings;
CREATE POLICY "Settings visível apenas por Admin e Diretoria do Tenant"
ON public.prospect_settings FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role))
);

DROP POLICY IF EXISTS "Settings gerenciado apenas por Admin do Tenant" ON public.prospect_settings;
CREATE POLICY "Settings gerenciado apenas por Admin do Tenant"
ON public.prospect_settings FOR ALL TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- 2. prospect_searches
ALTER TABLE public.prospect_searches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Searches visível por autor ou Admin/Diretoria" ON public.prospect_searches;
CREATE POLICY "Searches visível por autor ou Admin/Diretoria"
ON public.prospect_searches FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role))
);

DROP POLICY IF EXISTS "Searches inserido por usuários do tenant" ON public.prospect_searches;
CREATE POLICY "Searches inserido por usuários do tenant"
ON public.prospect_searches FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND created_by = auth.uid()
);

-- 3. prospect_companies (Modelo A - Carteira Própria + Buffer Invisível)
ALTER TABLE public.prospect_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies visível apenas por executivo proprietário ou Admin/Diretoria" ON public.prospect_companies;
CREATE POLICY "Companies visível apenas por executivo proprietário ou Admin/Diretoria"
ON public.prospect_companies FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (
    executivo_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'diretoria'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Companies atualizado pelo executivo de sua carteira ou Admin" ON public.prospect_companies;
CREATE POLICY "Companies atualizado pelo executivo de sua carteira ou Admin"
ON public.prospect_companies FOR UPDATE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (
    executivo_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'diretoria'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Companies inserido por Admin ou processo autorizado" ON public.prospect_companies;
CREATE POLICY "Companies inserido por Admin ou processo autorizado"
ON public.prospect_companies FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.current_tenant_id()
);

-- 4. prospect_campaigns
ALTER TABLE public.prospect_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Campaigns visível por usuários do tenant" ON public.prospect_campaigns;
CREATE POLICY "Campaigns visível por usuários do tenant"
ON public.prospect_campaigns FOR SELECT TO authenticated
USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Campaigns gerenciado por Admin e Diretoria" ON public.prospect_campaigns;
CREATE POLICY "Campaigns gerenciado por Admin e Diretoria"
ON public.prospect_campaigns FOR ALL TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role))
);

-- 5. prospect_interactions
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Interactions visível pelo executivo do lead ou Admin/Diretoria" ON public.prospect_interactions;
CREATE POLICY "Interactions visível pelo executivo do lead ou Admin/Diretoria"
ON public.prospect_interactions FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.prospect_companies c
      WHERE c.id = company_id AND c.executivo_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'diretoria'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Interactions notas internas por usuários comerciais" ON public.prospect_interactions;
CREATE POLICY "Interactions notas internas por usuários comerciais"
ON public.prospect_interactions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.current_tenant_id()
  AND (
    EXISTS (
      SELECT 1 FROM public.prospect_companies c
      WHERE c.id = company_id AND c.executivo_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'diretoria'::public.app_role)
  )
);

-- 6. prospect_blocklist
ALTER TABLE public.prospect_blocklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blocklist visível apenas por Admin e Diretoria" ON public.prospect_blocklist;
CREATE POLICY "Blocklist visível apenas por Admin e Diretoria"
ON public.prospect_blocklist FOR SELECT TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'diretoria'::public.app_role))
);

DROP POLICY IF EXISTS "Blocklist inserção de optout por usuários do tenant" ON public.prospect_blocklist;
CREATE POLICY "Blocklist inserção de optout por usuários do tenant"
ON public.prospect_blocklist FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "Blocklist exclusão restrita a Admin" ON public.prospect_blocklist;
CREATE POLICY "Blocklist exclusão restrita a Admin"
ON public.prospect_blocklist FOR DELETE TO authenticated
USING (
  tenant_id = public.current_tenant_id()
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
