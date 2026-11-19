-- ==============================================================================
-- MIGRATION: 20260930190000_midia_os_saas_master.sql
-- DESCRIÇÃO: Transformação Mídia OS SaaS Multi-Tenant, White-Label e Gestão de Mídia
-- AUTOR: Mídia OS / TV Brasília
-- DATA: 2026-09-30
-- POLÍTICA: Zero perda de dados, evolução aditiva e não-destrutiva
-- ==============================================================================

-- 1. EVOLUÇÃO DA TABELA TENANTS (White-Label, Limites e Personalização)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subdominio TEXT,
  ADD COLUMN IF NOT EXISTS dominio_proprio TEXT,
  ADD COLUMN IF NOT EXISTS prefixo_pi TEXT DEFAULT 'PI',
  ADD COLUMN IF NOT EXISTS prefixo_proposta TEXT DEFAULT 'PROP',
  ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS telefone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cidade TEXT,
  ADD COLUMN IF NOT EXISTS uf TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais TEXT,
  ADD COLUMN IF NOT EXISTS rodape_documentos TEXT,
  ADD COLUMN IF NOT EXISTS assinatura_padrao TEXT,
  ADD COLUMN IF NOT EXISTS dados_comerciais TEXT,
  ADD COLUMN IF NOT EXISTS dados_juridicos TEXT,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS limite_clientes INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS limite_parceiros INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS limite_campanhas INTEGER DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS limite_armazenamento_mb INTEGER DEFAULT 5120,
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdominio ON public.tenants(lower(subdominio)) WHERE subdominio IS NOT NULL;

-- 2. EVOLUÇÃO DAS TABELAS DE PIS E ITENS PARA RATEIO MULTI-PARCEIROS
-- ------------------------------------------------------------------------------
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS tipo_pi TEXT DEFAULT 'padrao', -- 'cliente' | 'parceiro' | 'consolidada' | 'padrao'
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pi_pai_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_comissao NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_repasse NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pis_tipo_pi ON public.pis(tipo_pi);
CREATE INDEX IF NOT EXISTS idx_pis_parceiro_id ON public.pis(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_pis_pi_pai_id ON public.pis(pi_pai_id);

ALTER TABLE public.pi_itens
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repasse_valor NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_id ON public.pi_itens(parceiro_id);

ALTER TABLE public.proposta_itens
  ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS comissao_pct NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comissao_valor NUMERIC(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repasse_valor NUMERIC(14,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_proposta_itens_parceiro_id ON public.proposta_itens(parceiro_id);

-- 3. TABELA DE RATEIO DA CAMPANHA (CAMPAIGN PARTNER ALLOCATION)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.campanha_rateios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  parceiro_id UUID NOT NULL REFERENCES public.parceiros(id) ON DELETE CASCADE,
  valor_comercializado NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  comissao_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  repasse_valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  status_repasse TEXT NOT NULL DEFAULT 'pendente', -- 'pendente' | 'aprovado' | 'pago' | 'cancelado'
  data_previsao_repasse DATE,
  data_pagamento_repasse DATE,
  comprovante_pagamento_url TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campanha_rateios_tenant ON public.campanha_rateios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campanha_rateios_pi ON public.campanha_rateios(pi_id);
CREATE INDEX IF NOT EXISTS idx_campanha_rateios_parceiro ON public.campanha_rateios(parceiro_id);

-- 4. TABELAS DE MODELOS DE CONTRATOS E CONTRATOS EMITIDOS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contrato_modelos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente', -- 'cliente' | 'agencia' | 'parceiro' | 'prestacao_servicos' | 'outro'
  conteudo TEXT NOT NULL,
  variaveis_disponiveis TEXT[] DEFAULT '{}',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contrato_modelos_tenant ON public.contrato_modelos(tenant_id);

CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente',
  titulo TEXT NOT NULL,
  modelo_id UUID REFERENCES public.contrato_modelos(id) ON DELETE SET NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  valor NUMERIC(14,2) NOT NULL DEFAULT 0,
  comissao_pct NUMERIC(5,2) DEFAULT 0,
  comissao_valor NUMERIC(14,2) DEFAULT 0,
  repasse_valor NUMERIC(14,2) DEFAULT 0,
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL DEFAULT 'rascunho', -- 'rascunho' | 'em_aprovacao' | 'aguardando_assinatura' | 'assinado' | 'recusado' | 'cancelado'
  conteudo_gerado TEXT,
  arquivo_url TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_tenant ON public.contratos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contratos_pi ON public.contratos(pi_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON public.contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_parceiro ON public.contratos(parceiro_id);

-- 5. TABELA DE COMPROVANTES DE EXECUÇÃO (EVIDÊNCIAS DE VEICULAÇÃO)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comprovantes_execucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  pi_item_id UUID REFERENCES public.pi_itens(id) ON DELETE SET NULL,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL DEFAULT 'foto', -- 'foto' | 'video' | 'print' | 'link' | 'relatorio' | 'documento'
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT,
  link_externo TEXT,
  data_veiculacao DATE,
  hora_veiculacao TEXT,
  validado BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprovantes_tenant ON public.comprovantes_execucao(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_pi ON public.comprovantes_execucao(pi_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_parceiro ON public.comprovantes_execucao(parceiro_id);

-- 6. PERMISSÕES E TRIGGERS DE SEGURANÇA E AUTO-TENANT
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campanha_rateios TO authenticated;
GRANT ALL ON public.campanha_rateios TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contrato_modelos TO authenticated;
GRANT ALL ON public.contrato_modelos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contratos TO authenticated;
GRANT ALL ON public.contratos TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprovantes_execucao TO authenticated;
GRANT ALL ON public.comprovantes_execucao TO service_role;

DO $$
DECLARE
  t text;
  tables text[] := ARRAY['campanha_rateios', 'contrato_modelos', 'contratos', 'comprovantes_execucao'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- RLS POLICIES
-- === CAMPANHA_RATEIOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_insert_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_update_campanha_rateios" ON public.campanha_rateios;
DROP POLICY IF EXISTS "tenant_isolation_delete_campanha_rateios" ON public.campanha_rateios;

CREATE POLICY "tenant_isolation_select_campanha_rateios" ON public.campanha_rateios
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_campanha_rateios" ON public.campanha_rateios
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_campanha_rateios" ON public.campanha_rateios
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_campanha_rateios" ON public.campanha_rateios
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === CONTRATO_MODELOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_insert_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_update_contrato_modelos" ON public.contrato_modelos;
DROP POLICY IF EXISTS "tenant_isolation_delete_contrato_modelos" ON public.contrato_modelos;

CREATE POLICY "tenant_isolation_select_contrato_modelos" ON public.contrato_modelos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_contrato_modelos" ON public.contrato_modelos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_update_contrato_modelos" ON public.contrato_modelos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_contrato_modelos" ON public.contrato_modelos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === CONTRATOS ===
DROP POLICY IF EXISTS "tenant_isolation_select_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_insert_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_update_contratos" ON public.contratos;
DROP POLICY IF EXISTS "tenant_isolation_delete_contratos" ON public.contratos;

CREATE POLICY "tenant_isolation_select_contratos" ON public.contratos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_contratos" ON public.contratos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_contratos" ON public.contratos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_contratos" ON public.contratos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- === COMPROVANTES_EXECUCAO ===
DROP POLICY IF EXISTS "tenant_isolation_select_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_insert_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_update_comprovantes" ON public.comprovantes_execucao;
DROP POLICY IF EXISTS "tenant_isolation_delete_comprovantes" ON public.comprovantes_execucao;

CREATE POLICY "tenant_isolation_select_comprovantes" ON public.comprovantes_execucao
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_insert_comprovantes" ON public.comprovantes_execucao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_update_comprovantes" ON public.comprovantes_execucao
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id())
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id = public.current_user_tenant_id());

CREATE POLICY "tenant_isolation_delete_comprovantes" ON public.comprovantes_execucao
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid())));

-- 7. SEED MODELOS DE CONTRATOS PADRÃO PARA TENANTS ATIVOS
-- ------------------------------------------------------------------------------
INSERT INTO public.contrato_modelos (tenant_id, titulo, tipo, conteudo, variaveis_disponiveis)
SELECT
  t.id,
  'Contrato de Comercialização e Veiculação de Mídia (Anunciante)',
  'cliente',
  'CONTRATO DE VEICULAÇÃO PUBLICITÁRIA E PRESTAÇÃO DE SERVIÇOS DE MÍDIA

Pelo presente instrumento particular, de um lado:

CONTRATADA: {{NOME_EMPRESA}}, inscrita no CNPJ sob o nº {{CNPJ_EMPRESA}}, com sede em {{ENDERECO_EMPRESA}}, doravante denominada simplesmente CONTRATADA;

E de outro lado:

CONTRATANTE: {{CLIENTE}}, inscrito(a) no CNPJ sob o nº {{CNPJ_CLIENTE}}, com interveniência de sua Agência {{AGENCIA}} (CNPJ {{CNPJ_AGENCIA}}), doravante denominada simplesmente CONTRATANTE;

CLÁUSULA PRIMEIRA – DO OBJETO
O presente contrato tem por objeto a veiculação publicitária da campanha "{{CAMPANHA}}", compreendendo os formatos, períodos e inserções discriminados no Pedido de Inserção correspondente.

CLÁUSULA SEGUNDA – DOS VALORES E FORMA DE PAGAMENTO
Pela prestação dos serviços e veiculação contratada, a CONTRATANTE pagará à CONTRATADA o valor total de {{VALOR}}, com vigência de {{DATA_INICIO}} até {{DATA_FIM}}.

CLÁUSULA TERCEIRA – DA COMPROVAÇÃO DE EXECUÇÃO
A CONTRATADA compromete-se a fornecer ao término de cada ciclo a respectiva comprovação de veiculação e relatório de execução.

CLÁUSULA QUARTA – DO FORO
Fica eleito o Foro da comarca da sede da CONTRATADA para dirimir quaisquer dúvidas oriundas deste instrumento.

Brasília/DF, em {{DATA_INICIO}}.

_______________________________              _______________________________
{{NOME_EMPRESA}}                              {{CLIENTE}}
Responsável: {{RESPONSAVEL}}

[AVISO LEGAL: Este é um modelo comercial disponibilizado pelo Mídia OS. Deve ser revisado pelo departamento jurídico da sua empresa antes da utilização definitiva.]',
  ARRAY['NOME_EMPRESA','CNPJ_EMPRESA','ENDERECO_EMPRESA','CLIENTE','CNPJ_CLIENTE','AGENCIA','CNPJ_AGENCIA','CAMPANHA','VALOR','DATA_INICIO','DATA_FIM','RESPONSAVEL']
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.contrato_modelos cm WHERE cm.tenant_id = t.id AND cm.tipo = 'cliente'
);

INSERT INTO public.contrato_modelos (tenant_id, titulo, tipo, conteudo, variaveis_disponiveis)
SELECT
  t.id,
  'Contrato de Representação e Repasse de Mídia (Veículo / Parceiro)',
  'parceiro',
  'CONTRATO DE REPRESENTAÇÃO COMERCIAL E REPASSE DE MÍDIA

Pelo presente instrumento, de um lado:

REPRESENTANTE: {{NOME_EMPRESA}}, inscrita no CNPJ sob o nº {{CNPJ_EMPRESA}}, com sede em {{ENDERECO_EMPRESA}};

E de outro lado:

VEÍCULO / PARCEIRO DE MÍDIA: {{PARCEIRO}}, inscrito no CNPJ sob o nº {{CNPJ_PARCEIRO}}, doravante denominado simplesmente PARCEIRO;

CLÁUSULA PRIMEIRA – DO OBJETO E CAMPANHA
O presente contrato regula a comercialização e veiculação da campanha "{{CAMPANHA}}", para o cliente {{CLIENTE}}.

CLÁUSULA SEGUNDA – DA REMUNERAÇÃO, COMISSÃO E REPASSE
1. O valor bruto comercializado referente aos produtos do PARCEIRO é de {{VALOR}}.
2. A comissão de representação devida à REPRESENTANTE é fixada em {{COMISSAO}}.
3. O valor líquido a ser repassado ao PARCEIRO é de {{REPASSE}}, a ser quitado conforme o cronograma financeiro ajustado.

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DO PARCEIRO
O PARCEIRO compromete-se a executar integralmente as inserções acordadas e encaminhar os respectivos comprovantes (checking fotográfico/audiovisual/métricas) em até 5 dias após a veiculação.

Brasília/DF, em {{DATA_INICIO}}.

_______________________________              _______________________________
{{NOME_EMPRESA}}                              {{PARCEIRO}}

[AVISO LEGAL: Este é um modelo comercial disponibilizado pelo Mídia OS. Deve ser revisado pelo departamento jurídico da sua empresa antes da utilização definitiva.]',
  ARRAY['NOME_EMPRESA','CNPJ_EMPRESA','ENDERECO_EMPRESA','PARCEIRO','CNPJ_PARCEIRO','CLIENTE','CAMPANHA','VALOR','COMISSAO','REPASSE','DATA_INICIO','DATA_FIM']
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.contrato_modelos cm WHERE cm.tenant_id = t.id AND cm.tipo = 'parceiro'
);
