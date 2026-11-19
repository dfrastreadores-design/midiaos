-- Migration: 20260623143324_89bfbd00-50ef-4c6e-a7be-6743c43f9de0.sql

-- 1) Tabela de planos
CREATE TABLE IF NOT EXISTS public.planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  descricao text,
  preco_mensal numeric(12,2) NOT NULL DEFAULT 0,
  max_usuarios integer, -- NULL = ilimitado
  modulos text[] NOT NULL DEFAULT '{}',
  is_default boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.planos TO authenticated;
GRANT ALL ON public.planos TO service_role;

ALTER TABLE public.planos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated le planos" ON public.planos;
CREATE POLICY "Authenticated le planos" ON public.planos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super admin gerencia planos" ON public.planos;
CREATE POLICY "Super admin gerencia planos" ON public.planos FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS planos_touch_updated_at ON public.planos;
CREATE TRIGGER planos_touch_updated_at BEFORE UPDATE ON public.planos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Tenants ganha vínculo com plano + overrides
ALTER TABLE public.tenants
  ADD COLUMN plano_id uuid REFERENCES public.planos(id),
  ADD COLUMN max_usuarios_override integer,
  ADD COLUMN modulos_override text[];

-- 3) Planos iniciais
INSERT INTO public.planos (nome, descricao, preco_mensal, max_usuarios, modulos, is_default) VALUES
  ('Básico', 'Para times pequenos começarem', 199.00, 3,
   ARRAY['pi','propostas','briefings','calendario'], true),
  ('Pro', 'Operação completa para agências em crescimento', 499.00, 10,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','crm','financeiro','calendario','metas','relatorios'], false),
  ('Enterprise', 'Tudo liberado, usuários ilimitados', 999.00, NULL,
   ARRAY['pi','propostas','briefings','projetos','influenciadores','permuta','financeiro','crm','calendario','metas','relatorios'], false);

-- 4) Helper: módulos efetivos da empresa do usuário
CREATE OR REPLACE FUNCTION public.tenant_modulos(_tenant_id uuid)
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.modulos_override,
    (SELECT p.modulos FROM public.planos p WHERE p.id = t.plano_id),
    '{}'::text[]
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_has_modulo(_tenant_id uuid, _modulo text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _modulo = ANY(public.tenant_modulos(_tenant_id))
$$;

-- 5) Helper: limite e contagem de usuários
CREATE OR REPLACE FUNCTION public.tenant_user_limit(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    t.max_usuarios_override,
    (SELECT p.max_usuarios FROM public.planos p WHERE p.id = t.plano_id)
  )
  FROM public.tenants t WHERE t.id = _tenant_id
$$;

CREATE OR REPLACE FUNCTION public.tenant_user_count(_tenant_id uuid)
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.profiles WHERE tenant_id = _tenant_id
$$;

-- 6) Vincula tenant existente (TV Brasília) ao plano Enterprise para não quebrar acesso
UPDATE public.tenants
SET plano_id = (SELECT id FROM public.planos WHERE nome = 'Enterprise')
WHERE plano_id IS NULL;

-- 7) handle_new_user passa a usar plano default em cadastros novos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_is_demo boolean := COALESCE((NEW.raw_user_meta_data->>'is_demo')::boolean, false);
  v_trial_ends timestamptz := NULL;
BEGIN
  IF v_is_demo THEN
    v_trial_ends := now() + interval '48 hours';
  END IF;

  INSERT INTO public.profiles (id, nome, email, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    NEW.email,
    v_trial_ends
  );

  IF v_is_demo THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;


-- Migration: 20260623150554_6b7bd554-2439-4ca5-8bff-f3d9c0fbdaaa.sql
DROP POLICY IF EXISTS "Owners can view their proposal history" ON public.proposal_history;
DROP POLICY IF EXISTS "Proposal viewers can view history" ON public.proposal_history;
CREATE POLICY "Proposal viewers can view history" ON public.proposal_history
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposal_history.proposal_id
      AND (
        p.created_by = auth.uid()
        OR p.executivo_id = auth.uid()
        OR p.executivo_parceiro_id = auth.uid()
        OR public.has_role(auth.uid(), 'executivo')
        OR public.has_role(auth.uid(), 'diretoria')
        OR public.has_role(auth.uid(), 'financeiro')
      )
  )
);

-- Migration: 20260623180508_c9e780ee-6702-4771-b5d2-f9e39947112c.sql

-- Tabela principal de Pós-Venda
CREATE TABLE IF NOT EXISTS public.pos_vendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviada','visualizada')),
  mensagem text,
  link_provas text,
  gerado_automaticamente boolean NOT NULL DEFAULT false,
  enviada_em timestamptz,
  visualizada_em timestamptz,
  tenant_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_vendas TO authenticated;
GRANT SELECT ON public.pos_vendas TO anon;
GRANT ALL ON public.pos_vendas TO service_role;

ALTER TABLE public.pos_vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_vendas read by pi access" ON public.pos_vendas;
CREATE POLICY "pos_vendas read by pi access" ON public.pos_vendas FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pos_vendas anon read by token" ON public.pos_vendas;
CREATE POLICY "pos_vendas anon read by token" ON public.pos_vendas FOR SELECT TO anon
  USING (true);

DROP POLICY IF EXISTS "pos_vendas insert by pi access" ON public.pos_vendas;
CREATE POLICY "pos_vendas insert by pi access" ON public.pos_vendas FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pos_vendas update by pi access" ON public.pos_vendas;
CREATE POLICY "pos_vendas update by pi access" ON public.pos_vendas FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pos_vendas delete by pi access" ON public.pos_vendas;
CREATE POLICY "pos_vendas delete by pi access" ON public.pos_vendas FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX IF NOT EXISTS pos_vendas_pi_idx ON public.pos_vendas(pi_id);
CREATE INDEX IF NOT EXISTS pos_vendas_token_idx ON public.pos_vendas(token);
CREATE INDEX IF NOT EXISTS pos_vendas_tenant_idx ON public.pos_vendas(tenant_id);
DROP TRIGGER IF EXISTS trg_pos_vendas_updated ON public.pos_vendas;
CREATE TRIGGER trg_pos_vendas_updated
  BEFORE UPDATE ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_pos_vendas_tenant ON public.pos_vendas;
CREATE TRIGGER trg_pos_vendas_tenant
  BEFORE INSERT ON public.pos_vendas
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- Anexos (provas) da Pós-Venda
CREATE TABLE IF NOT EXISTS public.pos_venda_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pos_venda_id uuid NOT NULL REFERENCES public.pos_vendas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  path text NOT NULL,
  mime text,
  tamanho integer,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_venda_anexos TO authenticated;
GRANT SELECT ON public.pos_venda_anexos TO anon;
GRANT ALL ON public.pos_venda_anexos TO service_role;

ALTER TABLE public.pos_venda_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pos_venda_anexos read by pi access" ON public.pos_venda_anexos;
CREATE POLICY "pos_venda_anexos read by pi access" ON public.pos_venda_anexos FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

DROP POLICY IF EXISTS "pos_venda_anexos anon read" ON public.pos_venda_anexos;
CREATE POLICY "pos_venda_anexos anon read" ON public.pos_venda_anexos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "pos_venda_anexos write by pi access" ON public.pos_venda_anexos;
CREATE POLICY "pos_venda_anexos write by pi access" ON public.pos_venda_anexos FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

DROP POLICY IF EXISTS "pos_venda_anexos delete by pi access" ON public.pos_venda_anexos;
CREATE POLICY "pos_venda_anexos delete by pi access" ON public.pos_venda_anexos FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND public.can_access_pi(pv.pi_id, auth.uid())
  ));

CREATE INDEX IF NOT EXISTS pos_venda_anexos_pos_venda_idx ON public.pos_venda_anexos(pos_venda_id);

-- Função que gera Pós-Vendas automaticamente para PIs com período encerrado
CREATE OR REPLACE FUNCTION public.gerar_pos_vendas_pendentes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO public.pos_vendas (pi_id, token, status, gerado_automaticamente, tenant_id, created_by)
  SELECT
    p.id,
    replace(gen_random_uuid()::text,'-','') || substring(md5(random()::text),1,10),
    'pendente',
    true,
    p.tenant_id,
    COALESCE(p.executivo_id, p.created_by)
  FROM public.pis p
  WHERE p.periodo_fim IS NOT NULL
    AND p.periodo_fim < (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND p.status NOT IN ('cancelado','substituido','reprovado','rascunho')
    AND public.is_tenant_operational(p.tenant_id)
    AND NOT EXISTS (SELECT 1 FROM public.pos_vendas pv WHERE pv.pi_id = p.id);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Agendamento horário para gerar pós-vendas automaticamente
SELECT cron.schedule(
  'gerar-pos-vendas-hourly',
  '15 * * * *',
  $cron$ SELECT public.gerar_pos_vendas_pendentes(); $cron$
);


-- Migration: 20260623180552_b0595527-1863-417c-bbaa-993b98f92555.sql

DROP POLICY IF EXISTS "pos-venda-anexos auth read" ON storage.objects;
CREATE POLICY "pos-venda-anexos auth read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "pos-venda-anexos auth insert" ON storage.objects;
CREATE POLICY "pos-venda-anexos auth insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "pos-venda-anexos auth delete" ON storage.objects;
CREATE POLICY "pos-venda-anexos auth delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );


-- Migration: 20260624134656_da76f092-1678-4df4-bc9e-aad398f745b9.sql

-- Tabela de emissoras (CNPJs emissores do PI)
CREATE TABLE IF NOT EXISTS public.emissoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  inscricao_estadual TEXT,
  inscricao_municipal TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  padrao BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS emissoras_tenant_idx ON public.emissoras(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.emissoras TO authenticated;
GRANT ALL ON public.emissoras TO service_role;

ALTER TABLE public.emissoras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant members can view emissoras" ON public.emissoras;
CREATE POLICY "tenant members can view emissoras" ON public.emissoras
  FOR SELECT USING (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "admin can manage emissoras" ON public.emissoras;
CREATE POLICY "admin can manage emissoras" ON public.emissoras
  FOR ALL USING (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );
DROP TRIGGER IF EXISTS trg_emissoras_updated ON public.emissoras;
CREATE TRIGGER trg_emissoras_updated
  BEFORE UPDATE ON public.emissoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Novas colunas em pis
ALTER TABLE public.pis
  ADD COLUMN emissora_id UUID REFERENCES public.emissoras(id) ON DELETE SET NULL,
  ADD COLUMN sem_comissao BOOLEAN NOT NULL DEFAULT false;


-- Migration: 20260624141812_851c537b-1291-44b3-b7a8-005f156603f3.sql
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS emissora_id uuid REFERENCES public.emissoras(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_produtos_emissora ON public.produtos(emissora_id);

-- Migration: 20260624150052_18bb80d8-2cf8-40ae-aa51-85d753835f9f.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS logo_url text;

-- Migration: 20260624150923_f77d8a02-291a-4546-9b35-d2b0d0e35ec4.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS valor_manual NUMERIC;
NOTIFY pgrst, 'reload schema';

-- Migration: 20260624151647_3a0c52ec-4150-4d01-943b-81be77f61476.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS observacoes text;

-- Migration: 20260624153855_39d4e11b-630a-4fdc-a01f-643ba4d2b1e4.sql
ALTER TABLE public.emissoras ADD COLUMN IF NOT EXISTS entrega_material TEXT;

-- Migration: 20260624161522_95116df9-6b07-4f47-a15f-36a88f4c5d25.sql

CREATE TABLE IF NOT EXISTS public.pi_share_links (
  token text PRIMARY KEY,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  signed_url text NOT NULL,
  storage_path text,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_access_at timestamptz,
  access_count integer NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE ON public.pi_share_links TO authenticated;
GRANT ALL ON public.pi_share_links TO service_role;

ALTER TABLE public.pi_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pi share links read by owner or admin" ON public.pi_share_links;
CREATE POLICY "pi share links read by owner or admin" ON public.pi_share_links
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi share links insert by owner or admin" ON public.pi_share_links;
CREATE POLICY "pi share links insert by owner or admin" ON public.pi_share_links
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX IF NOT EXISTS pi_share_links_pi_id_idx ON public.pi_share_links(pi_id);


-- Migration: 20260624162103_8ab632b3-fe2a-4923-bc4c-2b5fea739df2.sql
CREATE INDEX IF NOT EXISTS pi_historico_acao_created_at_idx ON public.pi_historico (acao, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_pi_id_created_at_idx ON public.pi_historico (pi_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_created_at_idx ON public.pi_historico (created_at DESC);
CREATE INDEX IF NOT EXISTS pi_share_links_created_at_idx ON public.pi_share_links (created_at DESC);

-- Migration: 20260624165858_633497ac-e1d5-4ac2-a5da-82c00747f8a4.sql

CREATE TABLE IF NOT EXISTS public.pi_aprovacoes_diretoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  tenant_id UUID,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',
  aprovador_nome TEXT,
  aprovador_cargo TEXT,
  assinatura_url TEXT,
  ip TEXT,
  user_agent TEXT,
  motivo_reprovacao TEXT,
  decidido_em TIMESTAMPTZ,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pi_aprov_dir_pi ON public.pi_aprovacoes_diretoria(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_aprov_dir_token ON public.pi_aprovacoes_diretoria(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_aprovacoes_diretoria TO authenticated;
GRANT ALL ON public.pi_aprovacoes_diretoria TO service_role;

ALTER TABLE public.pi_aprovacoes_diretoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant view aprov dir" ON public.pi_aprovacoes_diretoria;
CREATE POLICY "tenant view aprov dir" ON public.pi_aprovacoes_diretoria
  FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "tenant insert aprov dir" ON public.pi_aprovacoes_diretoria;
CREATE POLICY "tenant insert aprov dir" ON public.pi_aprovacoes_diretoria
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_pi_aprov_dir_updated ON public.pi_aprovacoes_diretoria;
CREATE TRIGGER trg_pi_aprov_dir_updated
  BEFORE UPDATE ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS trg_pi_aprov_dir_tenant ON public.pi_aprovacoes_diretoria;
CREATE TRIGGER trg_pi_aprov_dir_tenant
  BEFORE INSERT ON public.pi_aprovacoes_diretoria
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();


-- Migration: 20260624174905_90daac87-9d01-4dd3-8c55-59b7adf3b619.sql

-- [Consolidado no topo] CREATE TYPE public.tipo_midia
-- [Consolidado no topo] CREATE TYPE public.pessoa_tipo
-- [Consolidado no topo] CREATE TYPE public.comissao_escopo
-- [Consolidado no topo] CREATE TYPE public.comissao_status

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS produto_marca text NOT NULL DEFAULT 'midiaos',
  ADD COLUMN IF NOT EXISTS dominio_proprio text,
  ADD COLUMN IF NOT EXISTS cor_primaria text;

ALTER TABLE public.emissoras
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS pessoa_tipo public.pessoa_tipo NOT NULL DEFAULT 'pj',
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS nome_artistico text,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct numeric(6,3);

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS tipo_midia public.tipo_midia,
  ADD COLUMN IF NOT EXISTS quantidade_faces int,
  ADD COLUMN IF NOT EXISTS endereco_ponto text,
  ADD COLUMN IF NOT EXISTS formato_ooh text,
  ADD COLUMN IF NOT EXISTS plataforma_social text,
  ADD COLUMN IF NOT EXISTS seguidores bigint,
  ADD COLUMN IF NOT EXISTS engajamento_pct numeric(6,3),
  ADD COLUMN IF NOT EXISTS entregaveis_default jsonb;

INSERT INTO public.planos (nome, descricao, max_usuarios, modulos, preco_mensal, ativo)
SELECT 'Connect',
  'Edição white-label para representantes multi-veículo (TV, rádio, OOH, DOOH, influencers, redes sociais) com gestão de comissão.',
  25,
  ARRAY['crm','pi','propostas','briefings','tarefas','calendario','financeiro','relatorios','metas','permuta','projetos','influenciadores','pos_venda','comissoes','ooh','redes_sociais'],
  997, true
WHERE NOT EXISTS (SELECT 1 FROM public.planos WHERE nome = 'Connect');

CREATE TABLE IF NOT EXISTS public.comissoes_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  escopo public.comissao_escopo NOT NULL,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE CASCADE,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  pi_id uuid REFERENCES public.pis(id) ON DELETE CASCADE,
  tipo_midia public.tipo_midia,
  percentual numeric(6,3) NOT NULL,
  prioridade int NOT NULL DEFAULT 100,
  vigencia_inicio date,
  vigencia_fim date,
  ativa boolean NOT NULL DEFAULT true,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_regras TO authenticated;
GRANT ALL ON public.comissoes_regras TO service_role;
ALTER TABLE public.comissoes_regras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant lê regras" ON public.comissoes_regras;
CREATE POLICY "Tenant lê regras" ON public.comissoes_regras FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS "Admin gerencia regras" ON public.comissoes_regras;
CREATE POLICY "Admin gerencia regras" ON public.comissoes_regras FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
DROP TRIGGER IF EXISTS trg_comissoes_regras_tenant ON public.comissoes_regras;
CREATE TRIGGER trg_comissoes_regras_tenant BEFORE INSERT ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
DROP TRIGGER IF EXISTS trg_comissoes_regras_touch ON public.comissoes_regras;
CREATE TRIGGER trg_comissoes_regras_touch BEFORE UPDATE ON public.comissoes_regras FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.comissoes_apuracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  fornecedor_id uuid REFERENCES public.emissoras(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  executivo_id uuid,
  regra_id uuid REFERENCES public.comissoes_regras(id) ON DELETE SET NULL,
  base_calculo numeric(14,2) NOT NULL DEFAULT 0,
  percentual numeric(6,3) NOT NULL DEFAULT 0,
  valor numeric(14,2) NOT NULL DEFAULT 0,
  status public.comissao_status NOT NULL DEFAULT 'prevista',
  competencia date,
  pago_em date,
  comprovante_path text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pi_id, fornecedor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comissoes_apuracao TO authenticated;
GRANT ALL ON public.comissoes_apuracao TO service_role;
ALTER TABLE public.comissoes_apuracao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant lê comissões" ON public.comissoes_apuracao;
CREATE POLICY "Tenant lê comissões" ON public.comissoes_apuracao FOR SELECT TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (
    public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria')
    OR public.is_super_admin(auth.uid()) OR executivo_id = auth.uid()));
DROP POLICY IF EXISTS "Admin gerencia comissões" ON public.comissoes_apuracao;
CREATE POLICY "Admin gerencia comissões" ON public.comissoes_apuracao FOR ALL TO authenticated
  USING (tenant_id = public.current_tenant_id() AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'diretoria') OR public.is_super_admin(auth.uid())))
  WITH CHECK (tenant_id = public.current_tenant_id());
DROP TRIGGER IF EXISTS trg_comissoes_apuracao_tenant ON public.comissoes_apuracao;
CREATE TRIGGER trg_comissoes_apuracao_tenant BEFORE INSERT ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();
DROP TRIGGER IF EXISTS trg_comissoes_apuracao_touch ON public.comissoes_apuracao;
CREATE TRIGGER trg_comissoes_apuracao_touch BEFORE UPDATE ON public.comissoes_apuracao FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_pi public.pis%ROWTYPE; v_tenant uuid; v_tipo public.tipo_midia;
  v_base numeric; v_regra public.comissoes_regras%ROWTYPE; v_pct numeric; v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN RETURN; END IF;
  v_tenant := v_pi.tenant_id;

  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_tenant_operational(v_tenant) THEN
    RETURN;
  END IF;
  SELECT e.tipo_midia, e.comissao_padrao_pct INTO v_tipo, v_default FROM public.emissoras e WHERE e.id = _fornecedor_id;
  SELECT COALESCE(SUM(COALESCE(i.valor_negociado, i.valor_total, 0)),0) INTO v_base
    FROM public.pi_itens i WHERE i.pi_id = _pi_id AND i.emissora_id = _fornecedor_id;
  IF v_base = 0 THEN v_base := COALESCE(v_pi.valor_negociado, 0); END IF;
  SELECT * INTO v_regra FROM public.comissoes_regras r
   WHERE r.tenant_id = v_tenant AND r.ativa
     AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
     AND (r.vigencia_fim    IS NULL OR r.vigencia_fim    >= CURRENT_DATE)
     AND ((r.escopo='campanha' AND r.pi_id=_pi_id)
       OR (r.escopo='cliente' AND r.cliente_id=v_pi.cliente_id)
       OR (r.escopo='fornecedor' AND r.fornecedor_id=_fornecedor_id)
       OR (r.escopo='tipo_midia' AND r.tipo_midia=v_tipo)
       OR  r.escopo='global')
   ORDER BY CASE r.escopo WHEN 'campanha' THEN 1 WHEN 'cliente' THEN 2 WHEN 'fornecedor' THEN 3 WHEN 'tipo_midia' THEN 4 ELSE 5 END, r.prioridade ASC
   LIMIT 1;
  v_pct := COALESCE(v_regra.percentual, v_default, 0);
  regra_id := v_regra.id; percentual := v_pct; base := v_base; valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END $$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN SELECT DISTINCT emissora_id FROM public.pi_itens WHERE pi_id = NEW.id AND emissora_id IS NOT NULL LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);
    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado','veiculado','encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo=EXCLUDED.base_calculo, percentual=EXCLUDED.percentual, valor=EXCLUDED.valor, regra_id=EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status='paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pis_refresh_comissoes ON public.pis;
DROP TRIGGER IF EXISTS trg_pis_refresh_comissoes ON public.pis;
CREATE TRIGGER trg_pis_refresh_comissoes AFTER INSERT OR UPDATE OF status, valor_negociado ON public.pis
  FOR EACH ROW EXECUTE FUNCTION public.refresh_comissoes_pi();

CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_tenant_competencia ON public.comissoes_apuracao (tenant_id, competencia);
CREATE INDEX IF NOT EXISTS idx_comissoes_apuracao_executivo ON public.comissoes_apuracao (executivo_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_regras_tenant_ativa ON public.comissoes_regras (tenant_id, ativa);
CREATE INDEX IF NOT EXISTS idx_emissoras_tipo_midia ON public.emissoras (tipo_midia);
CREATE INDEX IF NOT EXISTS idx_produtos_tipo_midia ON public.produtos (tipo_midia);


-- Migration: 20260626005508_025b5a4c-196e-457f-99b8-9cb4f7065ecd.sql

ALTER TABLE public.propostas DROP CONSTRAINT propostas_cliente_id_fkey;
ALTER TABLE public.propostas ADD CONSTRAINT propostas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.permuta_recebimentos DROP CONSTRAINT permuta_recebimentos_cliente_id_fkey;
ALTER TABLE public.permuta_recebimentos ADD CONSTRAINT permuta_recebimentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;


-- Migration: 20260626011537_d1dde9e3-8044-445e-94d5-9e47a9627a2d.sql

-- Tighten EXECUTE privileges on SECURITY DEFINER functions (Supabase linter 0028/0029)

-- Trigger-only / server-only: revoke from all client roles
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'generate_pi_numero()',
    'generate_proposta_numero()',
    'touch_updated_at()',
    'update_updated_at_column()',
    'handle_new_user()',
    'log_alteracao()',
    'log_proposal_changes()',
    'refresh_comissoes_pi()',
    'set_tenant_id_from_user()',
    'handle_default_layout()',
    'update_permuta_saldo()',
    'read_email_batch(text,integer,integer)',
    'enqueue_email(text,jsonb)',
    'delete_email(text,bigint)',
    'move_to_dlq(text,text,bigint,jsonb)',
    'trigger_sync_cnpj_burst()',
    'gerar_pos_vendas_pendentes()'
  ] LOOP
    IF to_regprocedure(format('public.%s', fn)) IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    END IF;
  END LOOP;
END $$;

-- RLS helpers / tenant helpers: keep authenticated, drop public+anon
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'has_role(uuid,app_role)',
    'is_admin(uuid)',
    'is_super_admin(uuid)',
    'is_demo_user(uuid)',
    'is_trial_expired(uuid)',
    'can_access_pi(uuid,uuid)',
    'can_access_briefing(uuid,uuid)',
    'current_tenant_id()',
    'tenant_modulos(uuid)',
    'tenant_has_modulo(uuid,text)',
    'tenant_user_count(uuid)',
    'tenant_user_limit(uuid)',
    'calcular_comissao_pi(uuid,uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', fn);
  END LOOP;
END $$;


-- Migration: 20260626011742_07d9dff7-5f70-48ca-aaf5-486b8813cd01.sql

CREATE OR REPLACE FUNCTION public.admin_cron_runs(_limit int DEFAULT 50)
RETURNS TABLE(jobid bigint, jobname text, status text, return_message text, start_time timestamptz, end_time timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron, extensions
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT d.jobid, j.jobname, d.status, d.return_message, d.start_time, d.end_time
    FROM cron.job_run_details d
    LEFT JOIN cron.job j ON j.jobid = d.jobid
    ORDER BY d.start_time DESC
    LIMIT _limit;
EXCEPTION WHEN undefined_table THEN
  RETURN;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_cron_runs(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cron_runs(int) TO authenticated, service_role;


-- Migration: 20260627154519_69e99d49-0ff6-4f47-a4ee-9af583f3d120.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consentimento_lgpd_at timestamptz,
  ADD COLUMN IF NOT EXISTS consentimento_versao text;

CREATE TABLE IF NOT EXISTS public.lgpd_solicitacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('exportacao','exclusao','correcao')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluida','rejeitada')),
  observacoes text,
  resposta text,
  processado_em timestamptz,
  processado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lgpd_solicitacoes TO authenticated;
GRANT ALL ON public.lgpd_solicitacoes TO service_role;

ALTER TABLE public.lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário vê suas próprias solicitações LGPD" ON public.lgpd_solicitacoes;
CREATE POLICY "Usuário vê suas próprias solicitações LGPD" ON public.lgpd_solicitacoes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Usuário cria suas próprias solicitações LGPD" ON public.lgpd_solicitacoes;
CREATE POLICY "Usuário cria suas próprias solicitações LGPD" ON public.lgpd_solicitacoes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS trg_lgpd_solicitacoes_updated ON public.lgpd_solicitacoes;
CREATE TRIGGER trg_lgpd_solicitacoes_updated
  BEFORE UPDATE ON public.lgpd_solicitacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_user ON public.lgpd_solicitacoes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lgpd_solicitacoes_status ON public.lgpd_solicitacoes(status) WHERE status = 'pendente';


-- Migration: 20260628162752_c91ce6dc-36e0-45cb-840a-cbaac5b8e49a.sql

-- Índices para acelerar relatórios filtrando por período, executivo, cliente, agência e datas fiscais
CREATE INDEX IF NOT EXISTS pis_tenant_created_at_idx ON public.pis (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_executivo_created_at_idx ON public.pis (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_cliente_created_at_idx ON public.pis (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_agencia_created_at_idx ON public.pis (agencia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_status_idx ON public.pis (status);
CREATE INDEX IF NOT EXISTS pis_ano_mes_veiculacao_idx ON public.pis (ano_veiculacao, mes_veiculacao);
CREATE INDEX IF NOT EXISTS pis_periodo_idx ON public.pis (periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS pis_data_faturamento_idx ON public.pis (data_faturamento) WHERE data_faturamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_envio_nota_idx ON public.pis (data_envio_nota) WHERE data_envio_nota IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_vencimento_nota_idx ON public.pis (data_vencimento_nota) WHERE data_vencimento_nota IS NOT NULL;

CREATE INDEX IF NOT EXISTS propostas_executivo_created_at_idx ON public.propostas (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_cliente_created_at_idx ON public.propostas (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_status_idx ON public.propostas (status);

CREATE INDEX IF NOT EXISTS metas_executivo_ano_idx ON public.metas_executivo (ano, executivo_id);


-- Migration: 20260701160855_19ba71d3-5af6-448f-bded-bff21ad52487.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Migration: 20260701175346_6635ba91-8265-404e-92d3-f44becce6f0e.sql

-- 1) Tabela de datas comemorativas
CREATE TABLE IF NOT EXISTS public.datas_comemorativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dia smallint NOT NULL CHECK (dia BETWEEN 1 AND 31),
  mes smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria text NOT NULL DEFAULT 'comemorativa',
  segmentos_alvo text[] NOT NULL DEFAULT '{}',
  sugestoes_projetos text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(nome, dia, mes)
);

GRANT SELECT ON public.datas_comemorativas TO authenticated;
GRANT ALL ON public.datas_comemorativas TO service_role;

ALTER TABLE public.datas_comemorativas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "datas_read_all" ON public.datas_comemorativas;
CREATE POLICY "datas_read_all" ON public.datas_comemorativas
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "datas_admin_write" ON public.datas_comemorativas;
CREATE POLICY "datas_admin_write" ON public.datas_comemorativas
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_datas_comemorativas_updated ON public.datas_comemorativas;
CREATE TRIGGER trg_datas_comemorativas_updated
  BEFORE UPDATE ON public.datas_comemorativas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Seed de datas brasileiras principais
INSERT INTO public.datas_comemorativas (nome, dia, mes, categoria, segmentos_alvo, sugestoes_projetos) VALUES
('Ano Novo', 1, 1, 'sazonal', ARRAY['varejo','alimentacao','turismo'], 'Campanhas de retrospectiva, saudação de ano novo e promoções de recomeço.'),
('Dia do Consumidor', 15, 3, 'sazonal', ARRAY['varejo','ecommerce','servicos'], 'Ofertas relâmpago, cashback, cupons e descontos exclusivos.'),
('Páscoa', 20, 4, 'sazonal', ARRAY['alimentacao','varejo','confeitaria'], 'Kits de páscoa, chocolates, cestas e ações infantis.'),
('Dia das Mães', 12, 5, 'sazonal', ARRAY['varejo','moda','beleza','joias','floricultura','alimentacao'], 'Combos presente, campanhas emocionais e brindes especiais.'),
('Dia dos Namorados', 12, 6, 'sazonal', ARRAY['moda','joias','restaurantes','turismo','beleza'], 'Ações de casal, jantares, hotéis, joias e experiências.'),
('Festa Junina', 24, 6, 'sazonal', ARRAY['alimentacao','varejo','eventos'], 'Ativações regionais, kits temáticos e ações em bairros.'),
('Dia dos Pais', 10, 8, 'sazonal', ARRAY['varejo','automotivo','tecnologia','moda'], 'Ferramentas, tech, moda masculina e experiências para o pai.'),
('Dia do Cliente', 15, 9, 'sazonal', ARRAY['varejo','servicos','ecommerce'], 'Campanhas de fidelização, brindes e descontos exclusivos.'),
('Dia das Crianças', 12, 10, 'sazonal', ARRAY['brinquedos','varejo','alimentacao','entretenimento'], 'Brinquedos, parques, kits infantis e ações lúdicas.'),
('Black Friday', 28, 11, 'sazonal', ARRAY['varejo','ecommerce','tecnologia','automotivo','moda'], 'Grande volume de mídia, teasers e ofertas por categoria.'),
('Natal', 25, 12, 'sazonal', ARRAY['varejo','alimentacao','moda','joias','tecnologia','decoracao'], 'Campanha institucional de fim de ano, presentes e ceia.'),
('Volta às Aulas', 20, 1, 'sazonal', ARRAY['papelaria','educacao','moda','tecnologia'], 'Material escolar, uniformes, cursos e eletrônicos.'),
('Carnaval', 17, 2, 'sazonal', ARRAY['bebidas','turismo','moda','entretenimento'], 'Blocos, camarotes, patrocínios e ações de bebida.'),
('Dia da Mulher', 8, 3, 'sazonal', ARRAY['beleza','moda','saude','joias'], 'Homenagens, promoções e conteúdo institucional.'),
('Dia do Trabalho', 1, 5, 'sazonal', ARRAY['varejo','servicos','automotivo'], 'Feirões, promoções relâmpago e ações institucionais.'),
('Dia do Meio Ambiente', 5, 6, 'comemorativa', ARRAY['sustentabilidade','energia','saude'], 'Campanhas ESG, produtos sustentáveis e institucionais verdes.'),
('Independência do Brasil', 7, 9, 'sazonal', ARRAY['varejo','automotivo'], 'Semana da Pátria, feirões e ações patrióticas.'),
('Dia do Professor', 15, 10, 'comemorativa', ARRAY['educacao','livrarias','varejo'], 'Homenagens, cursos e presentes para docentes.'),
('Halloween', 31, 10, 'sazonal', ARRAY['entretenimento','alimentacao','varejo'], 'Fantasias, promoções temáticas e ações infantis.'),
('Copa do Mundo', 15, 6, 'comemorativa', ARRAY['bebidas','eletronicos','varejo'], 'TVs, cervejas, ativações esportivas (aplicável em anos de Copa).'),
('Réveillon', 31, 12, 'sazonal', ARRAY['turismo','bebidas','moda','restaurantes'], 'Pacotes, festas, moda branca e restaurantes.')
ON CONFLICT (nome, dia, mes) DO NOTHING;

-- 3) Função que gera notificações 45 dias antes
CREATE OR REPLACE FUNCTION public.notificar_datas_comemorativas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_alvo date := v_hoje + 45;
  v_data record;
  v_user record;
  v_clientes text;
  v_qtd_clientes int;
  v_mensagem text;
  v_count int := 0;
  v_target_year int;
BEGIN
  FOR v_data IN
    SELECT * FROM public.datas_comemorativas WHERE ativo
  LOOP
    -- calcula a próxima ocorrência da data
    v_target_year := EXTRACT(YEAR FROM v_alvo)::int;
    BEGIN
      IF make_date(v_target_year, v_data.mes, v_data.dia) <> v_alvo THEN
        CONTINUE;
      END IF;
    EXCEPTION WHEN OTHERS THEN CONTINUE;
    END;

    -- para cada usuário do sistema (por tenant), monta clientes-alvo
    FOR v_user IN
      SELECT p.id AS user_id, p.tenant_id
      FROM public.profiles p
      WHERE p.tenant_id IS NOT NULL
    LOOP
      SELECT string_agg(razao_social, ', ' ORDER BY razao_social), COUNT(*)
        INTO v_clientes, v_qtd_clientes
      FROM (
        SELECT razao_social FROM public.clientes
        WHERE tenant_id = v_user.tenant_id
          AND ativo = true
          AND (
            array_length(v_data.segmentos_alvo,1) IS NULL
            OR segmento = ANY(v_data.segmentos_alvo)
          )
        LIMIT 8
      ) sub;

      v_mensagem := format(
        '📅 %s em %s dias (%s). %s%sSugestões de projeto: %s',
        v_data.nome,
        (make_date(v_target_year, v_data.mes, v_data.dia) - v_hoje),
        to_char(make_date(v_target_year, v_data.mes, v_data.dia), 'DD/MM/YYYY'),
        CASE WHEN COALESCE(v_qtd_clientes,0) > 0
             THEN format('Clientes potenciais (%s): %s. ', v_qtd_clientes, v_clientes)
             ELSE 'Nenhum cliente cadastrado com segmento compatível. ' END,
        E'\n',
        COALESCE(v_data.sugestoes_projetos, 'Monte uma proposta temática dedicada.')
      );

      INSERT INTO public.notificacoes (user_id, tenant_id, tipo, titulo, mensagem, link, metadata)
      VALUES (
        v_user.user_id,
        v_user.tenant_id,
        'outro',
        'Oportunidade: ' || v_data.nome,
        v_mensagem,
        '/calendario',
        jsonb_build_object(
          'ref_id', v_data.id::text || '-' || v_target_year::text,
          'evento', 'data_comemorativa_45d',
          'data_id', v_data.id,
          'data_alvo', make_date(v_target_year, v_data.mes, v_data.dia),
          'segmentos', v_data.segmentos_alvo,
          'clientes_qtd', COALESCE(v_qtd_clientes,0)
        )
      )
      ON CONFLICT (user_id, tipo, (metadata->>'ref_id'), (metadata->>'evento')) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.notificar_datas_comemorativas() TO service_role;


-- Migration: 20260701192912_90dfa017-eaf2-4f5f-9796-7db9f70f9fd0.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Migration: 20260701204739_5210eb06-f945-4d16-acc7-b450cd10f870.sql
CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_forn uuid; v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado','faturado','veiculado','encerrado') THEN RETURN NEW; END IF;
  FOR v_forn IN
    SELECT DISTINCT emissora_id FROM public.pis WHERE id = NEW.id AND emissora_id IS NOT NULL
  LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);
    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado','veiculado','encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo=EXCLUDED.base_calculo, percentual=EXCLUDED.percentual, valor=EXCLUDED.valor, regra_id=EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status='paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;
  RETURN NEW;
END $function$;

-- Migration: 20260701205123_8549c6bc-1fb2-448a-8983-187417f710e6.sql
CREATE OR REPLACE FUNCTION public.calcular_comissao_pi(_pi_id uuid, _fornecedor_id uuid)
RETURNS TABLE(regra_id uuid, percentual numeric, base numeric, valor numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pi public.pis%ROWTYPE;
  v_tenant uuid;
  v_tipo public.tipo_midia;
  v_base numeric := 0;
  v_regra public.comissoes_regras%ROWTYPE;
  v_pct numeric;
  v_default numeric;
BEGIN
  SELECT * INTO v_pi FROM public.pis WHERE id = _pi_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_tenant := v_pi.tenant_id;

  SELECT e.tipo_midia, e.comissao_padrao_pct
    INTO v_tipo, v_default
  FROM public.emissoras e
  WHERE e.id = _fornecedor_id;

  IF v_pi.emissora_id IS NOT NULL AND v_pi.emissora_id = _fornecedor_id THEN
    SELECT COALESCE(
      SUM(
        COALESCE(
          i.valor_negociado,
          i.valor_tabela,
          COALESCE(i.valor_unit, 0) * COALESCE(i.total_insercoes, 1),
          0
        )
      ),
      0
    )
      INTO v_base
    FROM public.pi_itens i
    WHERE i.pi_id = _pi_id;
  END IF;

  IF COALESCE(v_base, 0) = 0 THEN
    v_base := COALESCE(v_pi.valor_negociado, 0);
  END IF;

  SELECT * INTO v_regra
  FROM public.comissoes_regras r
  WHERE r.tenant_id = v_tenant
    AND r.ativa
    AND (r.vigencia_inicio IS NULL OR r.vigencia_inicio <= CURRENT_DATE)
    AND (r.vigencia_fim IS NULL OR r.vigencia_fim >= CURRENT_DATE)
    AND (
      (r.escopo = 'campanha' AND r.pi_id = _pi_id)
      OR (r.escopo = 'cliente' AND r.cliente_id = v_pi.cliente_id)
      OR (r.escopo = 'fornecedor' AND r.fornecedor_id = _fornecedor_id)
      OR (r.escopo = 'tipo_midia' AND r.tipo_midia = v_tipo)
      OR r.escopo = 'global'
    )
  ORDER BY CASE r.escopo
    WHEN 'campanha' THEN 1
    WHEN 'cliente' THEN 2
    WHEN 'fornecedor' THEN 3
    WHEN 'tipo_midia' THEN 4
    ELSE 5
  END, r.prioridade ASC
  LIMIT 1;

  v_pct := COALESCE(v_regra.percentual, v_default, 0);

  regra_id := v_regra.id;
  percentual := v_pct;
  base := v_base;
  valor := round(v_base * v_pct / 100.0, 2);
  RETURN NEXT;
END
$function$;

CREATE OR REPLACE FUNCTION public.refresh_comissoes_pi()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_forn uuid;
  v_calc record;
BEGIN
  IF NEW.status NOT IN ('aprovado', 'faturado', 'veiculado', 'encerrado') THEN
    RETURN NEW;
  END IF;

  FOR v_forn IN
    SELECT NEW.emissora_id WHERE NEW.emissora_id IS NOT NULL
  LOOP
    SELECT * INTO v_calc FROM public.calcular_comissao_pi(NEW.id, v_forn);

    IF v_calc.base IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.comissoes_apuracao
      (tenant_id, pi_id, fornecedor_id, cliente_id, executivo_id, regra_id, base_calculo, percentual, valor, status, competencia)
    VALUES
      (NEW.tenant_id, NEW.id, v_forn, NEW.cliente_id, NEW.executivo_id, v_calc.regra_id,
       v_calc.base, v_calc.percentual, v_calc.valor,
       CASE WHEN NEW.status IN ('faturado', 'veiculado', 'encerrado') THEN 'confirmada'::comissao_status ELSE 'prevista'::comissao_status END,
       COALESCE(NEW.periodo_inicio, CURRENT_DATE))
    ON CONFLICT (pi_id, fornecedor_id) DO UPDATE
      SET base_calculo = EXCLUDED.base_calculo,
          percentual = EXCLUDED.percentual,
          valor = EXCLUDED.valor,
          regra_id = EXCLUDED.regra_id,
          status = CASE WHEN public.comissoes_apuracao.status = 'paga' THEN public.comissoes_apuracao.status ELSE EXCLUDED.status END,
          updated_at = now();
  END LOOP;

  RETURN NEW;
END
$function$;

-- Migration: 20260702171154_c1a0911b-4ab5-4732-a5c4-69900789ac7c.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS veiculacao_tipo TEXT NOT NULL DEFAULT 'livre'
    CHECK (veiculacao_tipo IN ('livre','dias_uteis','dias_fixos')),
  ADD COLUMN IF NOT EXISTS dias_fixos INTEGER[] NOT NULL DEFAULT '{}';

-- Migration: 20260703194132_27ff4dc2-e721-4254-bb36-1ed5d987cf8e.sql

-- 1) Trash table
CREATE TABLE IF NOT EXISTS public.trash_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  tabela TEXT NOT NULL,
  registro_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  descricao TEXT,
  deleted_by UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '45 days'),
  restored_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_trash_items_tenant ON public.trash_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trash_items_expires ON public.trash_items(expires_at) WHERE restored_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trash_items_tabela ON public.trash_items(tabela);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trash_items TO authenticated;
GRANT ALL ON public.trash_items TO service_role;

ALTER TABLE public.trash_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins podem ver lixeira do tenant" ON public.trash_items;
CREATE POLICY "Admins podem ver lixeira do tenant" ON public.trash_items FOR SELECT TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Admins podem atualizar lixeira" ON public.trash_items;
CREATE POLICY "Admins podem atualizar lixeira" ON public.trash_items FOR UPDATE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

DROP POLICY IF EXISTS "Admins podem apagar lixeira" ON public.trash_items;
CREATE POLICY "Admins podem apagar lixeira" ON public.trash_items FOR DELETE TO authenticated
USING (
  (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid()))
  AND (tenant_id IS NULL OR tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
);

-- Insert bypass: só via SECURITY DEFINER trigger (nenhuma policy de INSERT)

-- 2) Trigger genérico BEFORE DELETE
CREATE OR REPLACE FUNCTION public.trg_move_to_trash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB := to_jsonb(OLD);
  v_tenant UUID;
  v_desc TEXT;
BEGIN
  BEGIN v_tenant := (v_payload->>'tenant_id')::uuid; EXCEPTION WHEN OTHERS THEN v_tenant := NULL; END;
  v_desc := COALESCE(
    v_payload->>'razao_social',
    v_payload->>'nome_fantasia',
    v_payload->>'numero',
    v_payload->>'titulo',
    v_payload->>'nome',
    v_payload->>'campanha',
    v_payload->>'descricao'
  );
  INSERT INTO public.trash_items (tenant_id, tabela, registro_id, payload, descricao, deleted_by)
  VALUES (v_tenant, TG_TABLE_NAME, (v_payload->>'id'), v_payload, v_desc, auth.uid());
  RETURN OLD;
END $$;

-- 3) Attach nas tabelas principais
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','produtos',
    'projetos_especiais','influenciadores','tarefas','emissoras',
    'reunioes','eventos_calendario','materiais_apoio','links_uteis',
    'permuta_recebimentos','metas_executivo'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trash_before_delete ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trash_before_delete BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_move_to_trash()', t);
  END LOOP;
END $$;

-- 4) Restore function
CREATE OR REPLACE FUNCTION public.restore_trash_item(_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item public.trash_items%ROWTYPE;
  v_cols TEXT;
  v_vals TEXT;
BEGIN
  IF NOT (public.is_admin(auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO v_item FROM public.trash_items WHERE id = _id AND restored_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'item não encontrado'; END IF;

  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_tenant_operational(v_item.tenant_id) THEN
    RAISE EXCEPTION 'Operacao bloqueada: O periodo de teste de 72 horas expirou ou a assinatura esta suspensa.';
  END IF;

  -- Reinsere a partir do JSON, deixando o Postgres cuidar do casting via jsonb_populate_record
  EXECUTE format(
    'INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I, $1) ON CONFLICT (id) DO NOTHING',
    v_item.tabela, v_item.tabela
  ) USING v_item.payload;

  UPDATE public.trash_items SET restored_at = now() WHERE id = _id;
END $$;

-- 5) Purge expired (chamado por cron)
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM public.trash_items
   WHERE restored_at IS NULL AND expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- 6) Cron diário
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('purge-expired-trash')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-expired-trash');
    PERFORM cron.schedule('purge-expired-trash', '15 3 * * *', $cron$ SELECT public.purge_expired_trash(); $cron$);
  END IF;
END $$;


-- Migration: 20260706143415_4b996089-cc65-4563-9557-29ce42515e77.sql
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Migration: 20260706143603_743603c2-4e51-4884-b113-d40d3a35f897.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- Migration: 20260706144715_9843fed4-f80e-473f-a346-9fdad3b808f2.sql
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS investimentos_mensais JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.pis.investimentos_mensais IS
  'Mapa "YYYY-MM" -> valor (numeric) com o investimento mensal do cliente para cada mês do contrato. Se ausente, o rodapé do mapa de inserção usa a soma automática das entregas do mês.';

-- Migration: 20260706200344_2ab37d13-b8d4-4e4e-8840-2ea729c37f94.sql
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY
        pi_id,
        tipo,
        coalesce(programa, ''),
        coalesce(formato, ''),
        coalesce(horario, ''),
        coalesce(mes, 0),
        coalesce(ano, 0),
        insercoes_dia,
        coalesce(desconto, 0),
        coalesce(valor_unit, 0),
        coalesce(valor_tabela, 0),
        coalesce(valor_negociado, 0),
        total_insercoes,
        coalesce(dias_mes, '{}'::integer[]),
        coalesce(dias_semana, '{}'::text[])
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM public.pi_itens
)
DELETE FROM public.pi_itens i
USING ranked r
WHERE i.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS pi_itens_no_exact_duplicates_idx
ON public.pi_itens (
  pi_id,
  tipo,
  coalesce(programa, ''),
  coalesce(formato, ''),
  coalesce(horario, ''),
  coalesce(mes, 0),
  coalesce(ano, 0),
  insercoes_dia,
  coalesce(desconto, 0),
  coalesce(valor_unit, 0),
  coalesce(valor_tabela, 0),
  coalesce(valor_negociado, 0),
  total_insercoes,
  coalesce(dias_mes, '{}'::integer[]),
  coalesce(dias_semana, '{}'::text[])
);

-- Migration: 20260707144758_83ee45a3-6e57-4151-93be-c03dd9a2a61d.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS valor_opec numeric;
COMMENT ON COLUMN public.pis.valor_opec IS 'Valor interno para OPEC/uso interno em PIs de permuta. Não aparece no PI enviado ao cliente.';

-- Migration: 20260707182912_5bdb0a44-e364-482a-9fcf-d1067f0ab7c7.sql

DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;

DROP POLICY IF EXISTS "admin or diretoria insert metas" ON public.metas_executivo;
CREATE POLICY "admin or diretoria insert metas" ON public.metas_executivo
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

DROP POLICY IF EXISTS "admin or diretoria update metas" ON public.metas_executivo;
CREATE POLICY "admin or diretoria update metas" ON public.metas_executivo
  FOR UPDATE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));

DROP POLICY IF EXISTS "admin or diretoria delete metas" ON public.metas_executivo;
CREATE POLICY "admin or diretoria delete metas" ON public.metas_executivo
  FOR DELETE USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria'));


-- Migration: 20260709142451_0fe24083-a0c7-4859-9a6e-6bb84cb69c50.sql
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS dias_semana_fixos int[] NOT NULL DEFAULT '{}';

-- Migration: 20260714152605_a09f553b-4e7c-4baa-9c8c-1e06dae9e4e2.sql
ALTER TABLE public.produtos DROP CONSTRAINT IF EXISTS produtos_veiculacao_tipo_check;
ALTER TABLE public.produtos ADD CONSTRAINT produtos_veiculacao_tipo_check CHECK (veiculacao_tipo IN ('livre','dias_uteis','seg_sab','dias_fixos','dias_semana'));

-- Migration: 20260715143153_9173f13f-d5cc-4b49-85bf-e3026796d3cd.sql
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS categorias_servicos text[] NOT NULL DEFAULT '{}'::text[];

-- Migration: 20260715231830_825b05f6-01bd-4446-b77a-41a5a7e76804.sql

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS quantidade_telas integer,
  ADD COLUMN IF NOT EXISTS ambientes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS formato_tela text,
  ADD COLUMN IF NOT EXISTS resolucao text,
  ADD COLUMN IF NOT EXISTS tempo_exibicao_segundos integer,
  ADD COLUMN IF NOT EXISTS loop_minutos integer,
  ADD COLUMN IF NOT EXISTS insercoes_por_hora integer,
  ADD COLUMN IF NOT EXISTS horas_operacao_dia integer,
  ADD COLUMN IF NOT EXISTS detalhes_venda text;


-- Migration: 20260721173103_acfd1134-4ea8-45c9-b019-ea32f3208f58.sql

-- =========================================================
-- LANDING PAGES
-- =========================================================
CREATE TABLE IF NOT EXISTS public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','arquivada')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cor_primaria text,
  cor_texto text,
  logo_url text,
  hero_image_url text,
  meta_title text,
  meta_description text,
  meta_og_image text,
  executivo_id uuid,
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_pages_tenant_idx ON public.landing_pages (tenant_id);
CREATE INDEX IF NOT EXISTS landing_pages_status_idx ON public.landing_pages (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT SELECT ON public.landing_pages TO anon;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landing_pages tenant read" ON public.landing_pages;
CREATE POLICY "landing_pages tenant read" ON public.landing_pages FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "landing_pages tenant write" ON public.landing_pages;
CREATE POLICY "landing_pages tenant write" ON public.landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS "landing_pages tenant update" ON public.landing_pages;
CREATE POLICY "landing_pages tenant update" ON public.landing_pages FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "landing_pages tenant delete" ON public.landing_pages;
CREATE POLICY "landing_pages tenant delete" ON public.landing_pages FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "landing_pages public read published" ON public.landing_pages;
CREATE POLICY "landing_pages public read published" ON public.landing_pages FOR SELECT
  TO anon
  USING (status = 'publicada');
DROP TRIGGER IF EXISTS landing_pages_updated_at ON public.landing_pages;
CREATE TRIGGER landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS landing_pages_set_tenant ON public.landing_pages;
CREATE TRIGGER landing_pages_set_tenant
  BEFORE INSERT ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- =========================================================
-- LANDING PAGE LEADS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  mensagem text,
  campos_extras jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  origem text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  converted_at timestamptz,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contato','convertido','descartado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_page_leads_tenant_idx ON public.landing_page_leads (tenant_id);
CREATE INDEX IF NOT EXISTS landing_page_leads_page_idx ON public.landing_page_leads (landing_page_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_leads TO authenticated;
GRANT INSERT ON public.landing_page_leads TO anon;
GRANT ALL ON public.landing_page_leads TO service_role;

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "landing_leads tenant read" ON public.landing_page_leads;
CREATE POLICY "landing_leads tenant read" ON public.landing_page_leads FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "landing_leads tenant update" ON public.landing_page_leads;
CREATE POLICY "landing_leads tenant update" ON public.landing_page_leads FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "landing_leads tenant delete" ON public.landing_page_leads;
CREATE POLICY "landing_leads tenant delete" ON public.landing_page_leads FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

-- Anônimos podem inserir lead apenas se a landing estiver publicada
DROP POLICY IF EXISTS "landing_leads public insert" ON public.landing_page_leads;
CREATE POLICY "landing_leads public insert" ON public.landing_page_leads FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.landing_pages lp
       WHERE lp.id = landing_page_id
         AND lp.status = 'publicada'
         AND lp.tenant_id = landing_page_leads.tenant_id
    )
  );
DROP TRIGGER IF EXISTS landing_page_leads_updated_at ON public.landing_page_leads;
CREATE TRIGGER landing_page_leads_updated_at
  BEFORE UPDATE ON public.landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Contador atômico de views
-- =========================================================
CREATE OR REPLACE FUNCTION public.landing_page_increment_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.landing_pages
     SET views_count = views_count + 1
   WHERE slug = _slug AND status = 'publicada';
$$;

GRANT EXECUTE ON FUNCTION public.landing_page_increment_view(text) TO anon, authenticated;


-- Migration: 20260721173513_7f10fab6-43ce-426f-9530-4d70ac606f97.sql
ALTER TABLE public.landing_pages ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'modern';

-- Migration: 20260728170403_b486162b-6eee-4ea2-b534-9ea862a2e0c8.sql

-- 1. Remove blanket anon read on post-sale tables (public page uses the service-role server function)
DROP POLICY IF EXISTS "pos_vendas anon read by token" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_venda_anexos anon read" ON public.pos_venda_anexos;

-- 2. Scope proposta_anexos table reads to the proposal's tenant
DROP POLICY IF EXISTS "auth can view proposta anexos" ON public.proposta_anexos;
DROP POLICY IF EXISTS "view proposta anexos by proposta access" ON public.proposta_anexos;
CREATE POLICY "view proposta anexos by proposta access" ON public.proposta_anexos FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposta_anexos.proposta_id
      AND (p.tenant_id IS NULL OR p.tenant_id = current_tenant_id())
  )
);

-- 3. Security-definer helpers for storage policies
CREATE OR REPLACE FUNCTION public.can_access_storage_pi_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.pi_anexos a
    JOIN public.pis p ON p.id = a.pi_id
    WHERE a.arquivo_path = _name
      AND p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = _uid)
      AND public.is_tenant_operational(p.tenant_id)
      AND (public.is_admin(_uid) OR a.created_by = _uid OR public.can_access_pi(a.pi_id, _uid))
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_material(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.materiais_apoio m
    WHERE m.arquivo_path = _name
      AND m.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = _uid)
      AND public.is_tenant_operational(m.tenant_id)
      AND (public.is_admin(_uid) OR m.created_by = _uid)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_projeto(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.projetos_especiais p
    WHERE p.arquivo_url = _name
      AND p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = _uid)
      AND public.is_tenant_operational(p.tenant_id)
      AND (public.is_admin(_uid) OR p.created_by = _uid OR p.responsavel_id = _uid)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_storage_proposta_anexo(_name text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_super_admin(_uid) OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id::text = split_part(_name, '/', 1)
      AND p.tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = _uid)
      AND public.is_tenant_operational(p.tenant_id)
      AND (public.is_admin(_uid) OR p.created_by = _uid OR p.executivo_id = _uid)
  );
$$;

-- 4. Storage policies: pi-anexos
DROP POLICY IF EXISTS "pi-anexos read auth" ON storage.objects;
DROP POLICY IF EXISTS "pi-anexos read scoped" ON storage.objects;
CREATE POLICY "pi-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'pi-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_pi_anexo(name, auth.uid()))
);

-- 5. Storage policies: materiais-apoio
DROP POLICY IF EXISTS "auth read materiais-apoio files" ON storage.objects;
DROP POLICY IF EXISTS "materiais-apoio read scoped" ON storage.objects;
CREATE POLICY "materiais-apoio read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'materiais-apoio'
  AND (owner = auth.uid() OR public.can_access_storage_material(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload materiais-apoio files" ON storage.objects;
DROP POLICY IF EXISTS "materiais-apoio upload own folder" ON storage.objects;
CREATE POLICY "materiais-apoio upload own folder" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'materiais-apoio'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 6. Storage policies: projetos-especiais
DROP POLICY IF EXISTS "auth read projetos files" ON storage.objects;
DROP POLICY IF EXISTS "projetos read scoped" ON storage.objects;
CREATE POLICY "projetos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update projetos files" ON storage.objects;
DROP POLICY IF EXISTS "projetos update scoped" ON storage.objects;
CREATE POLICY "projetos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_projeto(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete projetos files" ON storage.objects;
DROP POLICY IF EXISTS "projetos delete scoped" ON storage.objects;
CREATE POLICY "projetos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'projetos-especiais'
  AND (owner = auth.uid() OR is_admin(auth.uid()))
);

-- 7. Storage policies: proposta-anexos
DROP POLICY IF EXISTS "auth view proposta-anexos files" ON storage.objects;
DROP POLICY IF EXISTS "proposta-anexos read scoped" ON storage.objects;
CREATE POLICY "proposta-anexos read scoped" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth update proposta-anexos files" ON storage.objects;
DROP POLICY IF EXISTS "proposta-anexos update scoped" ON storage.objects;
CREATE POLICY "proposta-anexos update scoped" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth delete proposta-anexos files" ON storage.objects;
DROP POLICY IF EXISTS "proposta-anexos delete scoped" ON storage.objects;
CREATE POLICY "proposta-anexos delete scoped" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proposta-anexos'
  AND (owner = auth.uid() OR is_admin(auth.uid()) OR public.can_access_storage_proposta_anexo(name, auth.uid()))
);
DROP POLICY IF EXISTS "auth upload proposta-anexos files" ON storage.objects;
DROP POLICY IF EXISTS "proposta-anexos upload scoped" ON storage.objects;
CREATE POLICY "proposta-anexos upload scoped" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'proposta-anexos'
  AND public.can_access_storage_proposta_anexo(name, auth.uid())
);


-- Migration: 20260728170444_4b1bbc1e-3cd5-4a71-935f-b711a6323927.sql

REVOKE ALL ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_material(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_projeto(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_access_storage_pi_anexo(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_material(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_projeto(text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_access_storage_proposta_anexo(text, uuid) TO authenticated, service_role;


-- Migration: 20260817141141_ecf4ffbe-a554-4a9f-a44c-867837ba2a87.sql
-- migration for tenant-specific proposal models and isolated visibility
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS proposta_layout_padrao text DEFAULT 'padrao';

-- Ensure all public tables have proper RLS for multi-tenancy
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario ve propostas do seu tenant" ON public.propostas
FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
CREATE POLICY "Usuario gerencia propostas do seu tenant" ON public.propostas
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Repeat for proposal_history (correct column name is proposal_id)
DROP POLICY IF EXISTS "Proposal viewers can view history" ON public.proposal_history;
DROP POLICY IF EXISTS "Usuario ve historico do seu tenant" ON public.proposal_history;
DROP POLICY IF EXISTS "tenant_isolation_proposal_history" ON public.proposal_history;
CREATE POLICY "tenant_isolation_proposal_history" ON public.proposal_history
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposal_history.proposal_id
      AND p.tenant_id = public.current_user_tenant_id()
      AND public.is_tenant_operational(p.tenant_id)
  )
);

GRANT SELECT ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;




-- Migration: 20260923120000_multi_tenant_isolation.sql
-- ==============================================================================
-- MIGRATION: 20260923120000_multi_tenant_isolation.sql
-- DESCRIÇÃO: Implementação definitiva de Isolamento Multi-Tenant e Super Admin
-- AUTOR: Sistema mídia.OS
-- DATA: 2026-09-23
-- ==============================================================================

-- 1. SUPER ADMIN EXCLUSIVO (rafaelrodrigo.as@gmail.com)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'rafaelrodrigo.as@gmail.com'
  );
$$;

-- 2. FUNÇÃO AUXILIAR: Obter tenant_id do usuário autenticado atual
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- 2.1 VALIDAÇÃO DE ASSINATURA SAAS & TESTE GRÁTIS DE 72 HORAS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_tenant_operational(_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = _tenant_id
      AND NOT COALESCE(t.bloqueado, false)
      AND (
        (t.subscription_status = 'active' AND (t.current_period_end IS NULL OR t.current_period_end >= now()))
        OR
        (t.subscription_status = 'trialing' AND (t.trial_ends_at IS NULL OR t.trial_ends_at >= now()))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_tenant_subscription_status(_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN COALESCE(t.bloqueado, false) THEN 'suspended'
      WHEN t.subscription_status = 'suspended' THEN 'suspended'
      WHEN t.subscription_status = 'active' THEN
        CASE
          WHEN t.current_period_end IS NOT NULL AND t.current_period_end < now() THEN 'past_due'
          ELSE 'active'
        END
      WHEN t.subscription_status = 'trialing' THEN
        CASE
          WHEN t.trial_ends_at IS NOT NULL AND t.trial_ends_at < now() THEN 'expired'
          ELSE 'trialing'
        END
      ELSE COALESCE(t.subscription_status, 'expired')
    END
  FROM public.tenants t
  WHERE t.id = _tenant_id;
$$;

CREATE OR REPLACE FUNCTION public.admin_activate_tenant_subscription(
  _tenant_id uuid,
  _plano_id uuid DEFAULT NULL,
  _ciclo text DEFAULT 'mensal',
  _dias_vigencia integer DEFAULT 30
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Super Admin pode ativar assinaturas.';
  END IF;

  UPDATE public.tenants
  SET
    plano_id = COALESCE(_plano_id, plano_id),
    ciclo = COALESCE(_ciclo, ciclo),
    subscription_status = 'active',
    status = 'ativo',
    bloqueado = false,
    bloqueado_motivo = NULL,
    current_period_start = now(),
    current_period_end = now() + (_dias_vigencia || ' days')::interval,
    last_payment_at = now(),
    updated_at = now()
  WHERE id = _tenant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_extend_tenant_trial(
  _tenant_id uuid,
  _horas_adicionais integer DEFAULT 72
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Super Admin pode estender periodos de teste.';
  END IF;

  UPDATE public.tenants
  SET
    subscription_status = 'trialing',
    status = 'ativo',
    bloqueado = false,
    bloqueado_motivo = NULL,
    trial_ends_at = GREATEST(now(), COALESCE(trial_ends_at, now())) + (_horas_adicionais || ' hours')::interval,
    updated_at = now()
  WHERE id = _tenant_id;
END;
$$;

-- 3. TRIGGER FUNCTION: Auto-atribuir tenant_id no INSERT
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_current_tenant_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  -- Se for super admin e forneceu tenant_id explicitamente, mantém
  IF public.is_super_admin(auth.uid()) AND NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Busca o tenant_id do usuário logado
  v_tenant_id := public.current_user_tenant_id();

  -- Se o usuário possui um tenant, força no registro inserido
  IF v_tenant_id IS NOT NULL THEN
    NEW.tenant_id := v_tenant_id;
  END IF;
  -- Bloqueio operacional se teste de 72h expirou ou assinatura suspensa
  IF NOT public.is_super_admin(auth.uid()) AND NOT public.is_tenant_operational(NEW.tenant_id) THEN
    RAISE EXCEPTION 'Operacao bloqueada: O periodo de teste de 72 horas expirou ou a assinatura esta suspensa.';
  END IF;

  RETURN NEW;
END;
$$;

-- 4. GARANTIR PRIVILÉGIOS DE SUPER_ADMIN PARA rafaelrodrigo.as@gmail.com
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = 'rafaelrodrigo.as@gmail.com' LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

-- Remove super_admin de qualquer outra conta para blindagem total
DELETE FROM public.user_roles ur
USING auth.users u
WHERE ur.user_id = u.id
  AND ur.role = 'super_admin'
  AND lower(u.email) <> 'rafaelrodrigo.as@gmail.com';

-- 4.1 BLINDAGEM DE ATRIBUIÇÃO DE ROLES (PROPOSTA B - SAAS MULTITENANT)
-- Impede que administradores de empresas concedam ou alterem a role super_admin
CREATE OR REPLACE FUNCTION public.check_role_assignment_security()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Apenas o proprio Super Admin pode remover seus privilegios.';
    END IF;
    RETURN OLD;
  END IF;

  -- Somente Rafael Rodrigo pode receber a role super_admin
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin(NEW.user_id) THEN
    RAISE EXCEPTION 'A role super_admin e exclusiva do proprietario da plataforma (Rafael Rodrigo).';
  END IF;

  -- Apenas o super_admin pode conceder super_admin
  IF NEW.role = 'super_admin' AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o super_admin pode conceder privilegios globais.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_role_assignment_security ON public.user_roles;
CREATE TRIGGER trg_role_assignment_security
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.check_role_assignment_security();

-- 5. ATIVAR TRIGGERS DE AUTO-TENANT NAS TABELAS PRINCIPAIS
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'agencias', 'clientes', 'pis', 'propostas', 'produtos', 'briefings',
    'metas_executivo', 'reunioes', 'eventos_calendario', 'tarefas',
    'landing_pages', 'landing_page_leads', 'permuta_saldos', 'permuta_recebimentos',
    'emissoras', 'comissoes_regras', 'comissoes_apuracao', 'pos_vendas',
    'links_uteis', 'materiais_apoio', 'influenciadores', 'projetos_especiais',
    'notificacoes', 'midia_config', 'trash_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Garante que RLS está habilitado
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    
    -- Cria trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I;', t);
    EXECUTE format('CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_current_tenant_id();', t);
  END LOOP;
END $$;

-- 6. POLÍTICAS DE RLS ESTREITAS PARA CADA TABELA DE NEGÓCIO
-- ------------------------------------------------------------------------------

-- === CLIENTES ===
DROP POLICY IF EXISTS "owner or admin update clientes" ON public.clientes;
DROP POLICY IF EXISTS "owner or admin read clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth read clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth write clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth update clientes" ON public.clientes;
DROP POLICY IF EXISTS "admin delete clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;

DROP POLICY IF EXISTS "tenant_isolation_select_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_select_clientes" ON public.clientes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_insert_clientes" ON public.clientes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_update_clientes" ON public.clientes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_clientes" ON public.clientes;
CREATE POLICY "tenant_isolation_delete_clientes" ON public.clientes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === AGÊNCIAS ===
DROP POLICY IF EXISTS "auth read agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth write agencias" ON public.agencias;
DROP POLICY IF EXISTS "auth update agencias" ON public.agencias;
DROP POLICY IF EXISTS "admin delete agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin read agencias" ON public.agencias;
DROP POLICY IF EXISTS "owner or admin update agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;

DROP POLICY IF EXISTS "tenant_isolation_select_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_select_agencias" ON public.agencias
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_insert_agencias" ON public.agencias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_update_agencias" ON public.agencias
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_agencias" ON public.agencias;
CREATE POLICY "tenant_isolation_delete_agencias" ON public.agencias
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PIS (PEDIDOS DE INSERÇÃO) ===
DROP POLICY IF EXISTS "auth read pis" ON public.pis;
DROP POLICY IF EXISTS "auth insert pis" ON public.pis;
DROP POLICY IF EXISTS "auth update pis" ON public.pis;
DROP POLICY IF EXISTS "admin delete pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin read pis" ON public.pis;
DROP POLICY IF EXISTS "owner or admin update pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_select_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_insert_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_update_pis" ON public.pis;
DROP POLICY IF EXISTS "tenant_isolation_delete_pis" ON public.pis;

DROP POLICY IF EXISTS "tenant_isolation_select_pis" ON public.pis;
CREATE POLICY "tenant_isolation_select_pis" ON public.pis
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_pis" ON public.pis;
CREATE POLICY "tenant_isolation_insert_pis" ON public.pis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_pis" ON public.pis;
CREATE POLICY "tenant_isolation_update_pis" ON public.pis
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_pis" ON public.pis;
CREATE POLICY "tenant_isolation_delete_pis" ON public.pis
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PROPOSTAS ===
DROP POLICY IF EXISTS "owner or admin update propostas" ON public.propostas;
DROP POLICY IF EXISTS "owner or admin read propostas" ON public.propostas;
DROP POLICY IF EXISTS "admin delete propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth insert propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth read propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth write propostas" ON public.propostas;
DROP POLICY IF EXISTS "auth update propostas" ON public.propostas;
DROP POLICY IF EXISTS "Usuario ve propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "Usuario gerencia propostas do seu tenant" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;

DROP POLICY IF EXISTS "tenant_isolation_select_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_select_propostas" ON public.propostas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_insert_propostas" ON public.propostas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_update_propostas" ON public.propostas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_propostas" ON public.propostas;
CREATE POLICY "tenant_isolation_delete_propostas" ON public.propostas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === PRODUTOS ===
DROP POLICY IF EXISTS "admin delete produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin update produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin insert produtos" ON public.produtos;
DROP POLICY IF EXISTS "auth read produtos" ON public.produtos;
DROP POLICY IF EXISTS "admin write produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;

DROP POLICY IF EXISTS "tenant_isolation_select_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_select_produtos" ON public.produtos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_insert_produtos" ON public.produtos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_update_produtos" ON public.produtos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "tenant_isolation_delete_produtos" ON public.produtos;
CREATE POLICY "tenant_isolation_delete_produtos" ON public.produtos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === BRIEFINGS ===
DROP POLICY IF EXISTS "Users can delete their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can update their own pending briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can create their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Users can view their own briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_select_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_insert_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_update_briefings" ON public.briefings;
DROP POLICY IF EXISTS "tenant_isolation_delete_briefings" ON public.briefings;

DROP POLICY IF EXISTS "tenant_isolation_select_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_select_briefings" ON public.briefings
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_insert_briefings" ON public.briefings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_update_briefings" ON public.briefings
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_briefings" ON public.briefings;
CREATE POLICY "tenant_isolation_delete_briefings" ON public.briefings
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR ((tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)) AND public.is_admin(auth.uid())));

-- === TAREFAS ===
DROP POLICY IF EXISTS "tarefas_all_auth" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_select_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_insert_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_update_tarefas" ON public.tarefas;
DROP POLICY IF EXISTS "tenant_isolation_delete_tarefas" ON public.tarefas;

DROP POLICY IF EXISTS "tenant_isolation_select_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_select_tarefas" ON public.tarefas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_insert_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_insert_tarefas" ON public.tarefas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_update_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_update_tarefas" ON public.tarefas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_delete_tarefas" ON public.tarefas;
CREATE POLICY "tenant_isolation_delete_tarefas" ON public.tarefas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

-- === LANDING PAGES E LEADS ===
DROP POLICY IF EXISTS "landing_pages tenant read" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant write" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant update" ON public.landing_pages;
DROP POLICY IF EXISTS "landing_pages tenant delete" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_select_landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_manage_landing_pages" ON public.landing_pages;
DROP POLICY IF EXISTS "tenant_isolation_select_landing_pages" ON public.landing_pages;
CREATE POLICY "tenant_isolation_select_landing_pages" ON public.landing_pages
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_manage_landing_pages" ON public.landing_pages;
CREATE POLICY "tenant_isolation_manage_landing_pages" ON public.landing_pages
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "tenant_isolation_select_leads" ON public.landing_page_leads;
DROP POLICY IF EXISTS "landing_leads tenant read" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_select_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_select_leads" ON public.landing_page_leads
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

DROP POLICY IF EXISTS "landing_leads tenant update" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_update_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_update_leads" ON public.landing_page_leads
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'executivo'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'executivo'))));

DROP POLICY IF EXISTS "landing_leads tenant delete" ON public.landing_page_leads;
DROP POLICY IF EXISTS "tenant_isolation_delete_leads" ON public.landing_page_leads;
CREATE POLICY "tenant_isolation_delete_leads" ON public.landing_page_leads
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === INFLUENCIADORES ===
DROP POLICY IF EXISTS "Admin e producao podem ver influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem inserir influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem atualizar influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "Admin e producao podem excluir influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_select_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_insert_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_update_influenciadores" ON public.influenciadores;
DROP POLICY IF EXISTS "tenant_isolation_delete_influenciadores" ON public.influenciadores;

CREATE POLICY "tenant_isolation_select_influenciadores" ON public.influenciadores
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_insert_influenciadores" ON public.influenciadores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_update_influenciadores" ON public.influenciadores
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'))));

CREATE POLICY "tenant_isolation_delete_influenciadores" ON public.influenciadores
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === PROJETOS ESPECIAIS ===
DROP POLICY IF EXISTS "auth read projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "auth write projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "auth insert projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "owner or admin update projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "admin delete projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "owner or admin read projetos" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_select_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_insert_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_update_projetos_especiais" ON public.projetos_especiais;
DROP POLICY IF EXISTS "tenant_isolation_delete_projetos_especiais" ON public.projetos_especiais;

CREATE POLICY "tenant_isolation_select_projetos_especiais" ON public.projetos_especiais
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_insert_projetos_especiais" ON public.projetos_especiais
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_projetos_especiais" ON public.projetos_especiais
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR responsavel_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_projetos_especiais" ON public.projetos_especiais
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === EVENTOS CALENDARIO ===
DROP POLICY IF EXISTS "users see own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users insert own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users update own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "users delete own eventos" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_select_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_insert_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_update_eventos_calendario" ON public.eventos_calendario;
DROP POLICY IF EXISTS "tenant_isolation_delete_eventos_calendario" ON public.eventos_calendario;

CREATE POLICY "tenant_isolation_select_eventos_calendario" ON public.eventos_calendario
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_insert_eventos_calendario" ON public.eventos_calendario
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_update_eventos_calendario" ON public.eventos_calendario
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_delete_eventos_calendario" ON public.eventos_calendario
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (user_id = auth.uid() OR public.is_admin(auth.uid()))));

-- === REUNIOES ===
DROP POLICY IF EXISTS "auth read reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "auth insert reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "auth update reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "admin delete reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin update reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin delete reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "owner or admin read reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_select_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_insert_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_update_reunioes" ON public.reunioes;
DROP POLICY IF EXISTS "tenant_isolation_delete_reunioes" ON public.reunioes;

CREATE POLICY "tenant_isolation_select_reunioes" ON public.reunioes
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_insert_reunioes" ON public.reunioes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_reunioes" ON public.reunioes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_reunioes" ON public.reunioes
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR executivo_id = auth.uid() OR created_by = auth.uid())));

-- === METAS EXECUTIVO ===
DROP POLICY IF EXISTS "auth read metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin delete metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "own or admin read metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria insert metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria update metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "admin or diretoria delete metas" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_select_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_insert_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_update_metas_executivo" ON public.metas_executivo;
DROP POLICY IF EXISTS "tenant_isolation_delete_metas_executivo" ON public.metas_executivo;

CREATE POLICY "tenant_isolation_select_metas_executivo" ON public.metas_executivo
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (executivo_id = auth.uid() OR public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_insert_metas_executivo" ON public.metas_executivo
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_update_metas_executivo" ON public.metas_executivo
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

CREATE POLICY "tenant_isolation_delete_metas_executivo" ON public.metas_executivo
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === MATERIAIS DE APOIO ===
DROP POLICY IF EXISTS "auth read materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "auth insert materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "owner or admin update materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "owner or admin delete materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_select_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_insert_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_update_materiais_apoio" ON public.materiais_apoio;
DROP POLICY IF EXISTS "tenant_isolation_delete_materiais_apoio" ON public.materiais_apoio;

CREATE POLICY "tenant_isolation_select_materiais_apoio" ON public.materiais_apoio
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_materiais_apoio" ON public.materiais_apoio
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_materiais_apoio" ON public.materiais_apoio
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())));

CREATE POLICY "tenant_isolation_delete_materiais_apoio" ON public.materiais_apoio
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR created_by = auth.uid())));

-- === PERMUTA SALDOS ===
DROP POLICY IF EXISTS "Authenticated can read permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "Service role manages permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.permuta_saldos;
DROP POLICY IF EXISTS "Users can manage permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation_select_permuta_saldos" ON public.permuta_saldos;
DROP POLICY IF EXISTS "tenant_isolation_manage_permuta_saldos" ON public.permuta_saldos;

CREATE POLICY "tenant_isolation_select_permuta_saldos" ON public.permuta_saldos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_permuta_saldos" ON public.permuta_saldos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === PERMUTA RECEBIMENTOS ===
DROP POLICY IF EXISTS "Authenticated can read permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Authenticated can insert permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Admins can update permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Admins can delete permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "Users can manage permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_select_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_insert_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_update_permuta_recebimentos" ON public.permuta_recebimentos;
DROP POLICY IF EXISTS "tenant_isolation_delete_permuta_recebimentos" ON public.permuta_recebimentos;

CREATE POLICY "tenant_isolation_select_permuta_recebimentos" ON public.permuta_recebimentos
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_permuta_recebimentos" ON public.permuta_recebimentos
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_permuta_recebimentos" ON public.permuta_recebimentos
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_permuta_recebimentos" ON public.permuta_recebimentos
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === EMISSORAS ===
DROP POLICY IF EXISTS "tenant members can view emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "admin can manage emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation_select_emissoras" ON public.emissoras;
DROP POLICY IF EXISTS "tenant_isolation_manage_emissoras" ON public.emissoras;

CREATE POLICY "tenant_isolation_select_emissoras" ON public.emissoras
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_emissoras" ON public.emissoras
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === COMISSOES REGRAS ===
DROP POLICY IF EXISTS "Tenant lê regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "Admin gerencia regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation_select_comissoes_regras" ON public.comissoes_regras;
DROP POLICY IF EXISTS "tenant_isolation_manage_comissoes_regras" ON public.comissoes_regras;

CREATE POLICY "tenant_isolation_select_comissoes_regras" ON public.comissoes_regras
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_comissoes_regras" ON public.comissoes_regras
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === COMISSOES APURACAO ===
DROP POLICY IF EXISTS "Tenant lê comissões" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "Admin gerencia comissões" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation_select_comissoes_apuracao" ON public.comissoes_apuracao;
DROP POLICY IF EXISTS "tenant_isolation_manage_comissoes_apuracao" ON public.comissoes_apuracao;

CREATE POLICY "tenant_isolation_select_comissoes_apuracao" ON public.comissoes_apuracao
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria') OR executivo_id = auth.uid())));

CREATE POLICY "tenant_isolation_manage_comissoes_apuracao" ON public.comissoes_apuracao
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'diretoria'))));

-- === POS VENDAS E ANEXOS ===
DROP POLICY IF EXISTS "pos_vendas read by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas insert by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas update by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "pos_vendas delete by pi access" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_select_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_insert_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_update_pos_vendas" ON public.pos_vendas;
DROP POLICY IF EXISTS "tenant_isolation_delete_pos_vendas" ON public.pos_vendas;

CREATE POLICY "tenant_isolation_select_pos_vendas" ON public.pos_vendas
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_insert_pos_vendas" ON public.pos_vendas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_update_pos_vendas" ON public.pos_vendas
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.can_access_pi(pi_id, auth.uid())));

CREATE POLICY "tenant_isolation_delete_pos_vendas" ON public.pos_vendas
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

DROP POLICY IF EXISTS "pos_venda_anexos read by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "pos_venda_anexos write by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "pos_venda_anexos delete by pi access" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "tenant_isolation" ON public.pos_venda_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pos_venda_anexos" ON public.pos_venda_anexos;

CREATE POLICY "tenant_isolation_pos_venda_anexos" ON public.pos_venda_anexos
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND pv.tenant_id = public.current_user_tenant_id()
      AND public.is_tenant_operational(pv.tenant_id)
  ))
  WITH CHECK (public.is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.pos_vendas pv
    WHERE pv.id = pos_venda_anexos.pos_venda_id
      AND pv.tenant_id = public.current_user_tenant_id()
      AND public.is_tenant_operational(pv.tenant_id)
  ));

-- === LINKS UTEIS ===
DROP POLICY IF EXISTS "Authenticated can view links" ON public.links_uteis;
DROP POLICY IF EXISTS "Authenticated can create links" ON public.links_uteis;
DROP POLICY IF EXISTS "Owner or admin can update links" ON public.links_uteis;
DROP POLICY IF EXISTS "Owner or admin can delete links" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_select_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_insert_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_update_links_uteis" ON public.links_uteis;
DROP POLICY IF EXISTS "tenant_isolation_delete_links_uteis" ON public.links_uteis;

CREATE POLICY "tenant_isolation_select_links_uteis" ON public.links_uteis
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_insert_links_uteis" ON public.links_uteis
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND auth.uid() = created_by));

CREATE POLICY "tenant_isolation_update_links_uteis" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))));

CREATE POLICY "tenant_isolation_delete_links_uteis" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND (auth.uid() = created_by OR public.is_admin(auth.uid()))));

-- === TRASH ITEMS ===
DROP POLICY IF EXISTS "Admins podem ver lixeira do tenant" ON public.trash_items;
DROP POLICY IF EXISTS "Admins podem atualizar lixeira" ON public.trash_items;
DROP POLICY IF EXISTS "Admins podem apagar lixeira" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_select_trash_items" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_update_trash_items" ON public.trash_items;
DROP POLICY IF EXISTS "tenant_isolation_delete_trash_items" ON public.trash_items;

CREATE POLICY "tenant_isolation_select_trash_items" ON public.trash_items
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_update_trash_items" ON public.trash_items
  FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

CREATE POLICY "tenant_isolation_delete_trash_items" ON public.trash_items
  FOR DELETE TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- === NOTIFICACOES ===
DROP POLICY IF EXISTS "users see own notif" ON public.notificacoes;
DROP POLICY IF EXISTS "users update own notif" ON public.notificacoes;
DROP POLICY IF EXISTS "auth insert notif" ON public.notificacoes;
DROP POLICY IF EXISTS "users or admins insert notif" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_select_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_insert_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_update_notificacoes" ON public.notificacoes;
DROP POLICY IF EXISTS "tenant_isolation_delete_notificacoes" ON public.notificacoes;

CREATE POLICY "tenant_isolation_select_notificacoes" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

CREATE POLICY "tenant_isolation_insert_notificacoes" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_update_notificacoes" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))))
  WITH CHECK (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

CREATE POLICY "tenant_isolation_delete_notificacoes" ON public.notificacoes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND (public.is_super_admin(auth.uid()) OR tenant_id IS NULL OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id))));

-- === MIDIA CONFIG ===
DROP POLICY IF EXISTS "auth read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin update midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation_select_midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "tenant_isolation_manage_midia_config" ON public.midia_config;

CREATE POLICY "tenant_isolation_select_midia_config" ON public.midia_config
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id)));

CREATE POLICY "tenant_isolation_manage_midia_config" ON public.midia_config
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())))
  WITH CHECK (public.is_super_admin(auth.uid()) OR (tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(tenant_id) AND public.is_admin(auth.uid())));

-- 7. TABELAS FILHAS (PI_ITENS, PROPOSTA_ITENS, ANEXOS)
-- ------------------------------------------------------------------------------
-- PI_ITENS
ALTER TABLE public.pi_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth insert pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth update pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "auth delete pi_itens" ON public.pi_itens;
DROP POLICY IF EXISTS "tenant_isolation_pi_itens" ON public.pi_itens;

DROP POLICY IF EXISTS "tenant_isolation_pi_itens" ON public.pi_itens;
CREATE POLICY "tenant_isolation_pi_itens" ON public.pi_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_itens.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  );

-- PROPOSTA_ITENS
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "auth write proposta_itens" ON public.proposta_itens;
DROP POLICY IF EXISTS "tenant_isolation_proposta_itens" ON public.proposta_itens;

DROP POLICY IF EXISTS "tenant_isolation_proposta_itens" ON public.proposta_itens;
CREATE POLICY "tenant_isolation_proposta_itens" ON public.proposta_itens
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND (pr.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(pr.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.propostas pr WHERE pr.id = proposta_itens.proposta_id AND (pr.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(pr.tenant_id))
    )
  );

-- PI_ANEXOS
ALTER TABLE public.pi_anexos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth read pi_anexos" ON public.pi_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pi_anexos" ON public.pi_anexos;
DROP POLICY IF EXISTS "tenant_isolation_pi_anexos" ON public.pi_anexos;
CREATE POLICY "tenant_isolation_pi_anexos" ON public.pi_anexos
  FOR ALL TO authenticated
  USING (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  )
  WITH CHECK (
    public.is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.pis p WHERE p.id = pi_anexos.pi_id AND (p.tenant_id = public.current_user_tenant_id() AND public.is_tenant_operational(p.tenant_id))
    )
  );

-- 8. PROFILES (ISOLAMENTO DE USUÁRIOS ENTRE EMPRESAS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users see all profiles" ON public.profiles;
DROP POLICY IF EXISTS "users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "admins update any profile" ON public.profiles;
DROP POLICY IF EXISTS "tenant_isolation_profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "tenant_isolation_profiles_update" ON public.profiles;

DROP POLICY IF EXISTS "tenant_isolation_profiles_select" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR tenant_id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "tenant_isolation_profiles_update" ON public.profiles;
CREATE POLICY "tenant_isolation_profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid()))
  )
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR auth.uid() = id
    OR (tenant_id = public.current_user_tenant_id() AND public.is_admin(auth.uid()))
  );

-- 8.1 BLINDAGEM CONTRA FUGA DE TENANT (PROPOSTA A - SAAS MULTITENANT)
-- Impede que usuários comuns alterem seu próprio tenant_id para obter acesso a outra empresa
CREATE OR REPLACE FUNCTION public.check_profile_tenant_immutability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.tenant_id IS NOT NULL AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Violacao de Seguranca: O tenant_id nao pode ser modificado por usuarios do tenant.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_tenant_immutability ON public.profiles;
CREATE TRIGGER trg_profile_tenant_immutability
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_tenant_immutability();

-- 8.2 DESVINCULAÇÃO INSTITUCIONAL DO SUPER ADMIN (PROPOSTA C)
-- Garante que o perfil do proprietário Rafael Rodrigo permaneça com governança transversal desvinculado de clientes
UPDATE public.profiles
   SET tenant_id = NULL
 WHERE lower(email) = 'rafaelrodrigo.as@gmail.com';

-- 9. TENANTS (GESTÃO EXCLUSIVA DO SUPER ADMIN, LEITURA DO PRÓPRIO TENANT)
-- ------------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin_all_tenants" ON public.tenants;
DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;

DROP POLICY IF EXISTS "users_read_own_tenant" ON public.tenants;
CREATE POLICY "users_read_own_tenant" ON public.tenants
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR id = public.current_user_tenant_id()
  );

DROP POLICY IF EXISTS "super_admin_manage_tenants" ON public.tenants;
CREATE POLICY "super_admin_manage_tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- ==============================================================================
-- FIM DA MIGRATION DE ISOLAMENTO MULTI-TENANT
-- ==============================================================================



-- ==============================================================================
-- PERMISSÕES DE SCHEMA REVISADAS (MÍNIMO PRIVILÉGIO - ZERO GRANT INDISCRIMINADO)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Revogação explícita de acessos amplos indevidos para anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

NOTIFY pgrst, 'reload schema';
