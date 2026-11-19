-- ==============================================================================
-- MIGRATION: 20260930200000_modulo_universal_assinaturas.sql
-- DESCRIÇÃO: Módulo Universal de Assinaturas (Transversal, Multi-Tenant, Digital, Manual e Híbrido)
-- AUTOR: Mídia OS / TV Brasília
-- DATA: 2026-09-30
-- POLÍTICA: Zero perda de dados, evolução aditiva e não-destrutiva
-- ==============================================================================

-- 1. TABELA PRINCIPAL DE DOCUMENTOS DE ASSINATURA
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documentos_assinatura (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  documento_tipo TEXT NOT NULL DEFAULT 'contrato', 
  -- 'proposta' | 'contrato' | 'contrato_prestacao' | 'contrato_parceiro' | 'contrato_cliente' | 'contrato_agencia' | 'pi' | 'termo' | 'autorizacao' | 'aditivo' | 'distrato' | 'declaracao' | 'comercial' | 'operacional' | 'financeiro' | 'prestacao_contas' | 'personalizado'
  referencia_tipo TEXT, -- 'contratos' | 'pis' | 'propostas' | 'clientes' | 'parceiros' | 'financeiro' | 'outro'
  referencia_id UUID,
  titulo TEXT NOT NULL,
  numero TEXT,
  descricao TEXT,
  
  -- Status do documento
  -- 'nao_necessita_assinatura' | 'aguardando_definicao' | 'aguardando_assinatura' | 'enviado_para_assinatura' | 'assinado_parcialmente' | 'assinado' | 'recusado' | 'cancelado' | 'expirado' | 'assinado_manualmente' | 'documento_assinado_recebido' | 'aguardando_conferencia'
  status TEXT NOT NULL DEFAULT 'aguardando_definicao',
  necessita_assinatura BOOLEAN NOT NULL DEFAULT true,
  metodo_preferencial TEXT NOT NULL DEFAULT 'hibrido', -- 'digital' | 'manual' | 'hibrido'
  ordem_tipo TEXT NOT NULL DEFAULT 'simultanea', -- 'simultanea' | 'sequencial'
  versao INTEGER NOT NULL DEFAULT 1,
  versao_anterior_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  
  -- Arquivos do fluxo documental
  documento_original_url TEXT,
  documento_impresso_url TEXT,
  documento_assinado_url TEXT,
  documento_manual_upload_url TEXT,
  
  -- Conferência de assinatura manual
  conferencia_status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovado' | 'rejeitado' | 'solicitado_novo'
  conferencia_observacoes TEXT,
  conferencia_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conferencia_em TIMESTAMPTZ,
  
  -- IA assistiva na conferência / pendências
  ia_analise JSONB DEFAULT '{}'::jsonb,
  
  -- Provedores de assinatura eletrônica
  provedor_assinatura TEXT NOT NULL DEFAULT 'interno', -- 'interno' | 'docusign' | 'clicksign' | 'zapsign' | 'outro'
  provedor_envelope_id TEXT,
  provedor_metadata JSONB DEFAULT '{}'::jsonb,
  certificado_url TEXT,
  
  -- Prazos e lembretes
  validade_limite DATE,
  lembretes_enviados INTEGER NOT NULL DEFAULT 0,
  ultimo_lembrete_em TIMESTAMPTZ,
  
  -- Metadados flexíveis (campanha, partes, valores, variáveis)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_assinatura_tenant ON public.documentos_assinatura(tenant_id);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_status ON public.documentos_assinatura(status);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_ref ON public.documentos_assinatura(referencia_tipo, referencia_id);
CREATE INDEX IF NOT EXISTS idx_doc_assinatura_tipo ON public.documentos_assinatura(documento_tipo);

-- 2. TABELA DE SIGNATÁRIOS DO DOCUMENTO
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_signatarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_assinatura(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cpf_cnpj TEXT,
  email TEXT,
  telefone TEXT,
  cargo TEXT,
  empresa TEXT,
  tipo_participante TEXT NOT NULL DEFAULT 'cliente', -- 'cliente' | 'parceiro' | 'nexo' | 'agencia' | 'testemunha' | 'outro'
  ordem INTEGER NOT NULL DEFAULT 1,
  metodo TEXT NOT NULL DEFAULT 'digital', -- 'digital' | 'manual'
  status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'enviado' | 'visualizado' | 'assinado' | 'recusado'
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  
  -- Dados da assinatura realizada
  assinado_em TIMESTAMPTZ,
  assinatura_imagem_url TEXT,
  documento_identificacao_url TEXT,
  ip TEXT,
  user_agent TEXT,
  geolocalizacao JSONB DEFAULT '{}'::jsonb,
  
  -- Recusa
  recusado_motivo TEXT,
  recusado_em TIMESTAMPTZ,
  
  lembretes_count INTEGER NOT NULL DEFAULT 0,
  ultimo_lembrete_em TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_signatarios_doc ON public.assinatura_signatarios(documento_id);
CREATE INDEX IF NOT EXISTS idx_assin_signatarios_tenant ON public.assinatura_signatarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assin_signatarios_token ON public.assinatura_signatarios(token);

-- 3. TABELA DE HISTÓRICO & AUDITORIA (TIMELINE)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id UUID NOT NULL REFERENCES public.documentos_assinatura(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  signatario_id UUID REFERENCES public.assinatura_signatarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  descricao TEXT NOT NULL,
  detalhes JSONB DEFAULT '{}'::jsonb,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_historico_doc ON public.assinatura_historico(documento_id);
CREATE INDEX IF NOT EXISTS idx_assin_historico_tenant ON public.assinatura_historico(tenant_id);

-- 4. TABELA DE CONFIGURAÇÃO DE ASSINATURA POR TENANT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assinatura_configuracoes_tenant (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  metodos_permitidos TEXT[] NOT NULL DEFAULT ARRAY['digital', 'manual', 'hibrido'],
  provedor_padrao TEXT NOT NULL DEFAULT 'interno', -- 'interno' | 'docusign' | 'clicksign' | 'zapsign'
  provedor_configs JSONB NOT NULL DEFAULT '{}'::jsonb,
  bloqueios JSONB NOT NULL DEFAULT '{
    "bloquear_campanha_sem_contrato": false,
    "bloquear_opec_sem_pi": true,
    "bloquear_faturamento_sem_assinatura": false
  }'::jsonb,
  prazo_padrao_dias INTEGER NOT NULL DEFAULT 5,
  lembretes_automaticos BOOLEAN NOT NULL DEFAULT true,
  lembretes_frequencia_dias INTEGER NOT NULL DEFAULT 2,
  lembretes_max INTEGER NOT NULL DEFAULT 3,
  canais_notificacao TEXT[] NOT NULL DEFAULT ARRAY['email', 'sistema', 'whatsapp'],
  signatarios_padrao JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assin_config_tenant ON public.assinatura_configuracoes_tenant(tenant_id);

-- 5. EVOLUÇÃO NÃO-DESTRUTIVA NAS TABELAS CONTRATOS E PIS
-- ------------------------------------------------------------------------------
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'aguardando_definicao';

ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'aguardando_definicao';

ALTER TABLE public.propostas
  ADD COLUMN IF NOT EXISTS necessita_assinatura BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS documento_assinatura_id UUID REFERENCES public.documentos_assinatura(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'nao_necessita_assinatura';

-- 6. PERMISSÕES E SEGURANÇA (RLS & TRIGGERS)
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos_assinatura TO authenticated;
GRANT ALL ON public.documentos_assinatura TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_signatarios TO authenticated;
GRANT ALL ON public.assinatura_signatarios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_historico TO authenticated;
GRANT ALL ON public.assinatura_historico TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assinatura_configuracoes_tenant TO authenticated;
GRANT ALL ON public.assinatura_configuracoes_tenant TO service_role;

-- Permitir leitura pública dos signatários pelo token e atualização de assinatura
GRANT SELECT ON public.documentos_assinatura TO anon;
GRANT SELECT, UPDATE ON public.assinatura_signatarios TO anon;
GRANT INSERT ON public.assinatura_historico TO anon;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'documentos_assinatura',
    'assinatura_signatarios',
    'assinatura_historico',
    'assinatura_configuracoes_tenant'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- POLÍTICAS RLS (Isolamento de tenant para autenticados)
DROP POLICY IF EXISTS "tenant_isolation_select_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_select_documentos_assinatura" ON public.documentos_assinatura
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_insert_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_insert_documentos_assinatura" ON public.documentos_assinatura
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_update_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_update_documentos_assinatura" ON public.documentos_assinatura
  FOR UPDATE TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "tenant_isolation_delete_documentos_assinatura" ON public.documentos_assinatura;
CREATE POLICY "tenant_isolation_delete_documentos_assinatura" ON public.documentos_assinatura
  FOR DELETE TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin());

-- Signatários (autenticados + acesso público por token)
DROP POLICY IF EXISTS "tenant_isolation_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "tenant_isolation_signatarios" ON public.assinatura_signatarios
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "public_token_select_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "public_token_select_signatarios" ON public.assinatura_signatarios
  FOR SELECT TO anon
  USING (token IS NOT NULL);

DROP POLICY IF EXISTS "public_token_update_signatarios" ON public.assinatura_signatarios;
CREATE POLICY "public_token_update_signatarios" ON public.assinatura_signatarios
  FOR UPDATE TO anon
  USING (token IS NOT NULL)
  WITH CHECK (token IS NOT NULL);

-- Documentos (leitura anônima se vinculada ao token do signatário)
DROP POLICY IF EXISTS "public_token_select_doc" ON public.documentos_assinatura;
CREATE POLICY "public_token_select_doc" ON public.documentos_assinatura
  FOR SELECT TO anon
  USING (true);

-- Histórico
DROP POLICY IF EXISTS "tenant_isolation_historico" ON public.assinatura_historico;
CREATE POLICY "tenant_isolation_historico" ON public.assinatura_historico
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());

DROP POLICY IF EXISTS "public_insert_historico" ON public.assinatura_historico;
CREATE POLICY "public_insert_historico" ON public.assinatura_historico
  FOR INSERT TO anon
  WITH CHECK (true);

-- Configurações Tenant
DROP POLICY IF EXISTS "tenant_isolation_config" ON public.assinatura_configuracoes_tenant;
CREATE POLICY "tenant_isolation_config" ON public.assinatura_configuracoes_tenant
  FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin())
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin());
