-- Migration: 20260610002145_ac7061f6-bfcd-4b8c-939b-6d9e7bc2566f.sql
-- Adiciona campos de produção na tabela de PIs
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_tipo TEXT CHECK (producao_tipo IN ('cliente', 'interna'));
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_contato TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_data TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_material_tipo TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_localizacao TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_observacoes TEXT;

-- Cria a tabela de solicitações de produção para histórico e gestão
CREATE TABLE IF NOT EXISTS public.solicitacoes_producao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
    solicitado_por UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_producao, concluida, cancelada
    contato TEXT,
    data_producao TIMESTAMP WITH TIME ZONE,
    material_tipo TEXT,
    localizacao TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilita RLS
ALTER TABLE public.solicitacoes_producao ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solicitacoes_producao TO authenticated;
GRANT ALL ON public.solicitacoes_producao TO service_role;

-- Policies
DROP POLICY IF EXISTS "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao;
CREATE POLICY "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao;
CREATE POLICY "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS update_solicitacoes_producao_updated_at ON public.solicitacoes_producao;
CREATE TRIGGER update_solicitacoes_producao_updated_at
BEFORE UPDATE ON public.solicitacoes_producao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Migration: 20260610013519_0eefa299-036f-4cf4-a69d-65e61b45059f.sql
CREATE TABLE IF NOT EXISTS public.proposal_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    modified_by UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'create', 'update', 'status_change', etc.
    changes JSONB, -- store what changed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.proposal_history TO authenticated;
GRANT ALL ON public.proposal_history TO service_role;

-- Enable RLS
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can view all proposal history" ON public.proposal_history;
CREATE POLICY "Admins can view all proposal history" ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS "Owners can view their proposal history" ON public.proposal_history;
CREATE POLICY "Owners can view their proposal history" ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.propostas 
        WHERE id = proposal_history.proposal_id AND created_by = auth.uid()
    )
);

-- Trigger to automatically log changes on propostas
CREATE OR REPLACE FUNCTION public.log_proposal_changes() 
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        -- Simple diff for important fields
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
        -- Add more fields as needed or just log the whole new state if changes are complex
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS trigger_log_proposal_changes ON public.propostas;
CREATE TRIGGER trigger_log_proposal_changes
AFTER INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_changes();


-- Migration: 20260610105118_63daa2f0-ffbe-4f6b-beb3-b2606a9001c3.sql

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own briefings' AND polrelid = 'public.briefings'::regclass) THEN
    DROP POLICY IF EXISTS "Users can delete their own briefings" ON public.briefings;
CREATE POLICY "Users can delete their own briefings" ON public.briefings FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;


-- Migration: 20260610130026_00eafeb4-62d4-46ee-9905-13f69176c86c.sql
ALTER TABLE public.briefings 
DROP CONSTRAINT IF EXISTS briefings_created_by_fkey;

ALTER TABLE public.briefings
ADD CONSTRAINT briefings_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Ensure permissions are correct
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;


-- Migration: 20260610132444_8e77c0d3-a806-4c61-9b94-eed9746c61cc.sql
ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS historico_cliente TEXT,
ADD COLUMN IF NOT EXISTS perfil_audiencia TEXT,
ADD COLUMN IF NOT EXISTS concorrentes TEXT,
ADD COLUMN IF NOT EXISTS tom_comunicacao TEXT,
ADD COLUMN IF NOT EXISTS peças_disponiveis TEXT,
ADD COLUMN IF NOT EXISTS expectativa_resultado TEXT;

-- Migration: 20260610132732_ddb93368-49a2-4efa-89f3-d40c8da6a5ee.sql
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON public.system_settings;
CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can view system settings" ON public.system_settings;
CREATE POLICY "Authenticated users can view system settings" ON public.system_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tabela para layouts de proposta
CREATE TABLE IF NOT EXISTS public.proposta_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_layouts TO authenticated;
GRANT ALL ON public.proposta_layouts TO service_role;

ALTER TABLE public.proposta_layouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage layouts" ON public.proposta_layouts;
CREATE POLICY "Admins can manage layouts" ON public.proposta_layouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can view layouts" ON public.proposta_layouts;
CREATE POLICY "Authenticated users can view layouts" ON public.proposta_layouts
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Adiciona coluna de layout_id na proposta
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES public.proposta_layouts(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS custom_config JSONB; -- Para ajustes específicos de uma única proposta

-- Trigger para garantir que apenas um layout seja default
CREATE OR REPLACE FUNCTION handle_default_layout() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_default_layout ON public.proposta_layouts;
CREATE TRIGGER trigger_default_layout
BEFORE INSERT OR UPDATE OF is_default ON public.proposta_layouts
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION handle_default_layout();

-- Migration: 20260610134442_a9666a73-bfbb-4b9f-8b69-f6f8166755b4.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_email TEXT;
ALTER TABLE public.solicitacoes_producao ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.pis.producao_email IS 'Email de contato para produção de material';
COMMENT ON COLUMN public.solicitacoes_producao.email IS 'Email de contato para a solicitação de produção';

-- Migration: 20260610135439_80268db8-5740-45cd-9f24-e355b47f93be.sql
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta_uso TEXT CHECK (permuta_uso IN ('empresa', 'comercial'));
COMMENT ON COLUMN public.pis.permuta_uso IS 'Destino do uso da permuta: empresa (calcula na meta) ou comercial (não calcula na meta)';

UPDATE public.pis SET permuta_uso = 'empresa' WHERE permuta = true AND permuta_uso IS NULL;

-- Migration: 20260610165502_99525b11-f598-42a6-bd21-c5665ab52aad.sql
-- Grant permissions to parceiro_comercial for briefings
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Ensure parceiro_comercial doesn't have other module permissions by default
-- (They might have others if manually added, but here we define the standard)
DELETE FROM public.role_permissions 
WHERE role = 'parceiro_comercial' 
AND permission_key NOT IN ('module.briefings');


-- Migration: 20260610170329_e852b491-c3fc-409f-a789-39e7000051ff.sql

CREATE TABLE IF NOT EXISTS public.briefing_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  briefing_id UUID NOT NULL REFERENCES public.briefings(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  arquivo_path TEXT NOT NULL,
  arquivo_nome TEXT NOT NULL,
  arquivo_tipo TEXT,
  arquivo_tamanho BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefing_anexos TO authenticated;
GRANT ALL ON public.briefing_anexos TO service_role;

ALTER TABLE public.briefing_anexos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS briefing_anexos_briefing_id_idx ON public.briefing_anexos(briefing_id);

CREATE OR REPLACE FUNCTION public.can_access_briefing(_briefing_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.briefings b
    WHERE b.id = _briefing_id
      AND (
        b.created_by = _user_id
        OR public.has_role(_user_id, 'admin')
        OR public.has_role(_user_id, 'executivo')
        OR public.has_role(_user_id, 'diretoria')
        OR public.has_role(_user_id, 'producao')
      )
  )
$$;

DROP POLICY IF EXISTS "briefing_anexos_select" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_select" ON public.briefing_anexos
  FOR SELECT TO authenticated
  USING (public.can_access_briefing(briefing_id, auth.uid()));

DROP POLICY IF EXISTS "briefing_anexos_insert" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_insert" ON public.briefing_anexos
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.can_access_briefing(briefing_id, auth.uid())
  );

DROP POLICY IF EXISTS "briefing_anexos_delete" ON public.briefing_anexos;
CREATE POLICY "briefing_anexos_delete" ON public.briefing_anexos
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );
DROP TRIGGER IF EXISTS briefing_anexos_updated_at ON public.briefing_anexos;
CREATE TRIGGER briefing_anexos_updated_at
  BEFORE UPDATE ON public.briefing_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for bucket "briefing-anexos"
-- Path convention: {briefing_id}/{filename}
DROP POLICY IF EXISTS "briefing_anexos_storage_select" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "briefing_anexos_storage_insert" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'briefing-anexos'
    AND public.can_access_briefing(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

DROP POLICY IF EXISTS "briefing_anexos_storage_delete" ON storage.objects;
CREATE POLICY "briefing_anexos_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'briefing-anexos'
    AND (
      owner = auth.uid()
      OR public.has_role(auth.uid(), 'admin')
    )
  );


-- Migration: 20260610175411_45b3bc2d-dd6c-486e-ad39-42624a9cc98a.sql
ALTER TABLE public.agencias ADD COLUMN logo_url TEXT;
GRANT ALL ON public.agencias TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agencias TO authenticated;


-- Migration: 20260610181444_979abef1-757f-49d4-bc44-cbfba6965447.sql
ALTER TABLE public.proposta_itens ADD COLUMN dias_veiculacao INTEGER;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_itens TO authenticated;
GRANT ALL ON public.proposta_itens TO service_role;

-- Migration: 20260610182249_18c76bec-7210-4960-bb06-7d42d461b849.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('admin', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Migration: 20260610182308_0aaf7d3e-1bf9-455b-90ee-71f6c46dc73a.sql
INSERT INTO public.role_permissions (role, permission_key)
VALUES ('executivo', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Migration: 20260611132022_5d71cd0a-15c9-4ad3-8f03-d691e24d1d01.sql
ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS produto_interesse TEXT,
ADD COLUMN IF NOT EXISTS tempo_contrato TEXT,
ADD COLUMN IF NOT EXISTS segmento_cliente TEXT;

-- Grant permissions (though table is already granted, adding specific columns is covered by ALL)
GRANT ALL ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;


-- Migration: 20260611173806_625f0e4a-b3d2-4960-a0bb-e7245b5bd085.sql
-- Habilitar pg_cron se ainda não estiver
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remover job anterior se existir (usando subquery segura)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-cnpj-daily') THEN
        PERFORM cron.unschedule('sync-cnpj-daily');
    END IF;
END $$;

-- Agendar novo job para rodar a cada minuto nas horas que correspondem a 00:01-05:55 BRT
-- 00:01-05:55 BRT é aproximadamente 03:01-08:55 UTC
SELECT cron.schedule(
    'sync-cnpj-daily',
    '* 3-8 * * *',
    $$
    SELECT
      net.http_post(
        url := (SELECT current_setting('app.settings.project_url') || '/api/public/hooks/sync-cnpj'),
        headers := '{"Content-Type": "application/json"}'::jsonb
      ) as request_id
    WHERE
      -- Validação extra do horário de Brasília (UTC-3)
      EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) BETWEEN 0 AND 5
      AND (
        (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 0 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) >= 1)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) = 5 AND EXTRACT(MINUTE FROM (now() AT TIME ZONE 'UTC-3')) <= 55)
        OR (EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) > 0 AND EXTRACT(HOUR FROM (now() AT TIME ZONE 'UTC-3')) < 5)
      )
    $$
);


-- Migration: 20260611180312_98220934-63f9-409f-bb13-aaa9b36620cb.sql
-- Adiciona coluna status à tabela de clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.clientes.status IS 'Status do cliente: ativo, inativo, prospect, bloqueado';

-- Adiciona coluna status à tabela de agencias
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.agencias.status IS 'Status da agência: ativa, inativa, bloqueada';


-- Migration: 20260611222025_55a609eb-0f9a-47c0-bb42-1a4e840abbf3.sql

-- Helper: check if user can access a PI (owner, executive, or admin)
CREATE OR REPLACE FUNCTION public.can_access_pi(_pi_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin(_user_id) OR EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = _pi_id
      AND (p.executivo_id = _user_id OR p.created_by = _user_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.can_access_pi(uuid, uuid) TO authenticated, service_role;

-- ============ pi_financeiro ============
DROP POLICY IF EXISTS "Authenticated users can view pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can insert pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can update pi_financeiro" ON public.pi_financeiro;
DROP POLICY IF EXISTS "Authenticated users can delete pi_financeiro" ON public.pi_financeiro;

DROP POLICY IF EXISTS "pi_financeiro select owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro select owner/admin" ON public.pi_financeiro
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro insert owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro insert owner/admin" ON public.pi_financeiro
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro update owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro update owner/admin" ON public.pi_financeiro
  FOR UPDATE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()))
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "pi_financeiro delete owner/admin" ON public.pi_financeiro;
CREATE POLICY "pi_financeiro delete owner/admin" ON public.pi_financeiro
  FOR DELETE TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

-- ============ storage: financeiro-docs ============
-- Path convention: pi/{pi_id}/...
DROP POLICY IF EXISTS "Authenticated users can view financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update financeiro docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete financeiro docs" ON storage.objects;

DROP POLICY IF EXISTS "financeiro-docs select owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs select owner/admin" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs insert owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs insert owner/admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs update owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs update owner/admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

DROP POLICY IF EXISTS "financeiro-docs delete owner/admin" ON storage.objects;
CREATE POLICY "financeiro-docs delete owner/admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'financeiro-docs'
    AND (storage.foldername(name))[1] = 'pi'
    AND public.can_access_pi(((storage.foldername(name))[2])::uuid, auth.uid())
  );

-- ============ solicitacoes_producao ============
DROP POLICY IF EXISTS "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao;
DROP POLICY IF EXISTS "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao;

DROP POLICY IF EXISTS "solicitacoes select owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes select owner/admin" ON public.solicitacoes_producao
  FOR SELECT TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()) OR public.can_access_pi(pi_id, auth.uid()));

DROP POLICY IF EXISTS "solicitacoes insert owner" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes insert owner" ON public.solicitacoes_producao
  FOR INSERT TO authenticated
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "solicitacoes update owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes update owner/admin" ON public.solicitacoes_producao
  FOR UPDATE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()))
  WITH CHECK (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "solicitacoes delete owner/admin" ON public.solicitacoes_producao;
CREATE POLICY "solicitacoes delete owner/admin" ON public.solicitacoes_producao
  FOR DELETE TO authenticated
  USING (solicitado_por = auth.uid() OR public.is_admin(auth.uid()));

-- ============ sync_cnpj_log: admin-only reads ============
DROP POLICY IF EXISTS "sync log readable by authenticated" ON public.sync_cnpj_log;

DROP POLICY IF EXISTS "sync log readable by admin" ON public.sync_cnpj_log;
CREATE POLICY "sync log readable by admin" ON public.sync_cnpj_log
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ Function search_path hardening ============
CREATE OR REPLACE FUNCTION public.handle_default_layout()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;


-- Migration: 20260612151814_79824117-29fb-4eb2-bc6a-fe0910402046.sql

CREATE TABLE IF NOT EXISTS public.proposta_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id uuid NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_anexos TO authenticated;
GRANT ALL ON public.proposta_anexos TO service_role;

ALTER TABLE public.proposta_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth can view proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can view proposta anexos" ON public.proposta_anexos
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth can insert proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can insert proposta anexos" ON public.proposta_anexos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
DROP POLICY IF EXISTS "auth can update own proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can update own proposta anexos" ON public.proposta_anexos
  FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "auth can delete own proposta anexos" ON public.proposta_anexos;
CREATE POLICY "auth can delete own proposta anexos" ON public.proposta_anexos
  FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_proposta_anexos_updated_at ON public.proposta_anexos;
CREATE TRIGGER trg_proposta_anexos_updated_at
  BEFORE UPDATE ON public.proposta_anexos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_proposta_anexos_proposta ON public.proposta_anexos(proposta_id);

-- Storage policies for proposta-anexos bucket
DROP POLICY IF EXISTS "auth view proposta-anexos files" ON storage.objects;
CREATE POLICY "auth view proposta-anexos files" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth upload proposta-anexos files" ON storage.objects;
CREATE POLICY "auth upload proposta-anexos files" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth update proposta-anexos files" ON storage.objects;
CREATE POLICY "auth update proposta-anexos files" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-anexos');
DROP POLICY IF EXISTS "auth delete proposta-anexos files" ON storage.objects;
CREATE POLICY "auth delete proposta-anexos files" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'proposta-anexos');


-- Migration: 20260615141823_87b658ba-af2b-49fc-b8ea-cbe399efd0e2.sql

ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS permuta_valor_faturado NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.update_permuta_saldo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cliente_id UUID;
  v_agencia_id UUID;
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_cliente_id := OLD.cliente_id;
    v_agencia_id := OLD.agencia_id;
  ELSE
    v_cliente_id := NEW.cliente_id;
    v_agencia_id := NEW.agencia_id;
  END IF;

  v_entidade_id := COALESCE(v_cliente_id, v_agencia_id);
  IF v_entidade_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF v_cliente_id IS NOT NULL THEN
    v_tipo := 'cliente';
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    v_tipo := 'agencia';
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  -- Considera apenas a parte NÃO faturada (valor_negociado - permuta_valor_faturado)
  SELECT COALESCE(SUM(GREATEST(valor_negociado - COALESCE(permuta_valor_faturado, 0), 0)), 0)
    INTO v_total_pi
    FROM public.pis
   WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id)
     AND permuta = true
     AND status != 'cancelado';

  SELECT COALESCE(SUM(valor), 0)
    INTO v_total_rec
    FROM public.permuta_recebimentos
   WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    tipo = EXCLUDED.tipo,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;


-- Migration: 20260615142603_3ef2ff26-385e-4fec-9275-ef007b2ea25f.sql
CREATE TABLE IF NOT EXISTS public.links_uteis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  icone TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.links_uteis TO authenticated;
GRANT ALL ON public.links_uteis TO service_role;

ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view links" ON public.links_uteis;
CREATE POLICY "Authenticated can view links" ON public.links_uteis
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can create links" ON public.links_uteis;
CREATE POLICY "Authenticated can create links" ON public.links_uteis
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Owner or admin can update links" ON public.links_uteis;
CREATE POLICY "Owner or admin can update links" ON public.links_uteis
  FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Owner or admin can delete links" ON public.links_uteis;
CREATE POLICY "Owner or admin can delete links" ON public.links_uteis
  FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS links_uteis_updated_at ON public.links_uteis;
CREATE TRIGGER links_uteis_updated_at
  BEFORE UPDATE ON public.links_uteis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migration: 20260615175418_1e9908d6-a912-4363-b6cd-47c2bb2911db.sql
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS executivo_parceiro_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Migration: 20260616191534_e3aceddf-7dae-457f-a348-e1790e0d71cf.sql
CREATE OR REPLACE FUNCTION public.log_proposal_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_negociado IS DISTINCT FROM NEW.valor_negociado THEN
            v_changes := v_changes || jsonb_build_object('valor_negociado', jsonb_build_object('old', OLD.valor_negociado, 'new', NEW.valor_negociado));
        END IF;
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$function$;

-- Migration: 20260616200938_fe197fa0-8452-4230-9d30-128156ad2400.sql
ALTER TABLE public.pis
  ADD COLUMN IF NOT EXISTS mes_meta INTEGER,
  ADD COLUMN IF NOT EXISTS ano_meta INTEGER;

-- Migration: 20260617182226_d58a8f2c-c5a3-4c3b-b51c-61aa83249b55.sql
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS apelido text;
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS apelido text;

-- Migration: 20260619203256_a8c5b0f9-3bd4-400d-9a1d-6586561a09cf.sql

CREATE TABLE IF NOT EXISTS public.influenciadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'influenciador',
  nicho TEXT,
  cidade TEXT,
  estado TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  facebook TEXT,
  twitter TEXT,
  outras_redes TEXT,
  seguidores_total BIGINT,
  cache_valor NUMERIC(14,2),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influenciadores TO authenticated;
GRANT ALL ON public.influenciadores TO service_role;

ALTER TABLE public.influenciadores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin e producao podem ver influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem ver influenciadores" ON public.influenciadores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem inserir influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem inserir influenciadores" ON public.influenciadores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem atualizar influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem atualizar influenciadores" ON public.influenciadores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

DROP POLICY IF EXISTS "Admin e producao podem excluir influenciadores" ON public.influenciadores;
CREATE POLICY "Admin e producao podem excluir influenciadores" ON public.influenciadores FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));
DROP TRIGGER IF EXISTS influenciadores_updated_at ON public.influenciadores;
CREATE TRIGGER influenciadores_updated_at
  BEFORE UPDATE ON public.influenciadores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();


-- Migration: 20260622190555_397869ef-cee5-4aec-93ca-37d49642148c.sql
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS logo_data_url text;

-- Migration: 20260623030853_f977e4ad-34c1-4801-af7a-f1d686785926.sql

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.is_trial_expired(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL AND trial_ends_at < now()
  )
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
    -- Demo: recebe admin para acessar todos os módulos durante 48h
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $$;


-- Migration: 20260623034455_49c6b52b-46f5-4f20-a38c-2537a1ce8868.sql
-- [Higienização] UPDATE auth.users suprimido
-- Migration: 20260623041157_2c92bccf-db45-45df-a419-8e502fcc4fdb.sql

-- Helper: identifica contas demo (com trial)
CREATE OR REPLACE FUNCTION public.is_demo_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND trial_ends_at IS NOT NULL
  )
$$;

-- has_role: contas demo nunca herdam papéis elevados em policies
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
  AND NOT public.is_demo_user(_user_id)
$$;

-- is_admin já depende de has_role, então herda o filtro automaticamente.

-- Reescreve policies de briefings que faziam SELECT direto em user_roles
DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;

DROP POLICY IF EXISTS "Admins and Executives can view all briefings" ON public.briefings;
CREATE POLICY "Admins and Executives can view all briefings" ON public.briefings FOR SELECT
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));

DROP POLICY IF EXISTS "Admins and Executives can update any briefing" ON public.briefings;
CREATE POLICY "Admins and Executives can update any briefing" ON public.briefings FOR UPDATE
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'executivo'));


-- Migration: 20260623041819_c5a24d08-e755-442e-97e0-bf0b04e6f5b9.sql

-- 1) Adiciona super_admin ao enum
-- [Consolidado no topo] ALTER TYPE ADD VALUE


-- Migration: 20260623041856_a412fb2c-9fe9-48a9-ba42-805145fc436b.sql

-- ============ TENANTS (SaaS Multi-Tenant com Teste Grátis de 72h) ============
CREATE TABLE IF NOT EXISTS public.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text,
  contato_nome text,
  contato_email text,
  contato_whatsapp text,
  plano text NOT NULL DEFAULT 'essencial', -- essencial | site | profissional | enterprise | demo
  ciclo text NOT NULL DEFAULT 'mensal',    -- mensal | anual
  valor_mensal numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',    -- ativo | inadimplente | suspenso | cancelado | trial
  -- Ciclo de Vida da Assinatura SaaS
  subscription_status text NOT NULL DEFAULT 'trialing' CHECK (subscription_status IN ('trialing', 'active', 'expired', 'past_due', 'suspended')),
  trial_started_at timestamptz NOT NULL DEFAULT now(),
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '72 hours'),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  payment_provider text,
  payment_subscription_id text,
  last_payment_at timestamptz,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  proximo_vencimento date,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Helper super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = 'rafaelrodrigo.as@gmail.com'
  );
$$;

-- is_admin agora reconhece super_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT public.has_role(_user_id,'admin') OR public.is_super_admin(_user_id)
$$;

DROP POLICY IF EXISTS "super admin manages tenants" ON public.tenants;
CREATE POLICY "super admin manages tenants" ON public.tenants
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS tg_tenants_touch ON public.tenants;
CREATE TRIGGER tg_tenants_touch BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ HISTÓRICO DE ASSINATURAS E FATURAS SAAS ============
CREATE TABLE IF NOT EXISTS public.tenant_faturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ciclo text NOT NULL DEFAULT 'mensal' CHECK (ciclo IN ('mensal', 'anual')),
  valor numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'falho', 'cancelado', 'estornado')),
  data_vencimento date,
  data_pagamento timestamptz,
  metodo_pagamento text, -- pix | cartao | boleto | manual
  referencia_externa text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tenant_faturas TO authenticated;
GRANT ALL ON public.tenant_faturas TO service_role;
ALTER TABLE public.tenant_faturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "super admin gerencia faturas" ON public.tenant_faturas;
CREATE POLICY "super admin gerencia faturas" ON public.tenant_faturas
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "usuarios veem faturas do proprio tenant" ON public.tenant_faturas;
CREATE POLICY "usuarios veem faturas do proprio tenant" ON public.tenant_faturas
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- ============ PROFILES.tenant_id ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id);

-- ============ Seed tenant TV Brasília ============
INSERT INTO public.tenants (
  id, razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, observacoes,
  subscription_status, trial_started_at, trial_ends_at, current_period_start, current_period_end
)
VALUES (
  'a711a129-330c-46bf-943a-531cedd4f2ff', 'TV Brasília', 'TV Brasília', 'enterprise', 'mensal', 0, 'ativo', 'Cliente inicial — plano sob contrato.',
  'active', now(), NULL, now(), '2030-12-31 23:59:59+00'::timestamptz
)
ON CONFLICT (id) DO UPDATE SET
  subscription_status = 'active',
  trial_ends_at = NULL,
  current_period_end = '2030-12-31 23:59:59+00'::timestamptz;

-- Vincula todos os profiles sem tenant a TV Brasília (exceto contas demo e proprietário global)
UPDATE public.profiles
SET tenant_id = (SELECT id FROM public.tenants WHERE razao_social = 'TV Brasília' LIMIT 1)
WHERE tenant_id IS NULL AND trial_ends_at IS NULL AND lower(coalesce(email, '')) <> 'rafaelrodrigo.as@gmail.com';

-- ============ Usuário super_admin ============
-- Cria o auth.user se ainda não existir
-- [Higienização] Injeção direta em auth.users suprimida; gerido via GoTrue/Signup



-- Migration: 20260623043033_f988699b-b5d6-4ed3-8cd0-17e0f7a9e142.sql
-- [Higienização] UPDATE auth.users suprimido
-- Migration: 20260623043911_f4a92f77-a56a-489c-8fbb-164d65e666d9.sql

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS max_usuarios integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mensagem_alerta text,
  ADD COLUMN IF NOT EXISTS bloqueado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bloqueado_em timestamptz,
  ADD COLUMN IF NOT EXISTS bloqueado_motivo text;

-- Permite que qualquer usuário autenticado leia APENAS a mensagem de alerta / status de bloqueio do seu próprio tenant
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
DROP POLICY IF EXISTS "Usuários veem o próprio tenant" ON public.tenants;
CREATE POLICY "Usuários veem o próprio tenant" ON public.tenants FOR SELECT
  TO authenticated
  USING (id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));


-- Migration: 20260623045153_b84fcc54-be3e-4da3-87f6-950e067ed62f.sql

-- Desabilita triggers de auditoria durante o backfill (auth.uid() é NULL na migration)
-- [Higienização] SET session_replication_role suprimido

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
$$;

DO $$
DECLARE
  v_default_tenant uuid := 'a711a129-330c-46bf-943a-531cedd4f2ff';
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL', t, v_default_tenant);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(tenant_id)', t || '_tenant_id_idx', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    EXECUTE format($p$
      CREATE POLICY tenant_isolation ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid())
        OR tenant_id IS NULL
        OR tenant_id = public.current_tenant_id()
      )
    $p$, t);
  END LOOP;
END $$;

UPDATE public.profiles
   SET tenant_id = 'a711a129-330c-46bf-943a-531cedd4f2ff'
 WHERE tenant_id IS NULL
   AND trial_ends_at IS NULL
   AND lower(coalesce(email, '')) <> 'rafaelrodrigo.as@gmail.com';

CREATE OR REPLACE FUNCTION public.set_tenant_id_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.current_tenant_id();
  END IF;
  RETURN NEW;
END $$;

DO $$
DECLARE
  v_tables text[] := ARRAY[
    'clientes','agencias','propostas','pis','briefings','tarefas',
    'influenciadores','produtos','projetos_especiais','eventos_calendario',
    'reunioes','metas_executivo','materiais_apoio','links_uteis',
    'midia_config','notificacoes','permuta_recebimentos',
    'solicitacoes_producao','permuta_saldos'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY v_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_tenant_id_trg ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_tenant_id_trg BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user()', t);
  END LOOP;
END $$;

-- [Higienização] SET session_replication_role suprimido


-- Migration: 20260623050440_29d974b5-0d51-4130-850f-0aeec46f25a3.sql

CREATE TABLE IF NOT EXISTS public.system_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  emoji TEXT DEFAULT '✨',
  versao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_announcements TO authenticated;
GRANT ALL ON public.system_announcements TO service_role;

ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Qualquer autenticado vê ativos" ON public.system_announcements;
CREATE POLICY "Qualquer autenticado vê ativos" ON public.system_announcements FOR SELECT
  TO authenticated
  USING (ativo = true OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Super admin gerencia" ON public.system_announcements;
CREATE POLICY "Super admin gerencia" ON public.system_announcements FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
DROP TRIGGER IF EXISTS trg_system_announcements_updated ON public.system_announcements;
CREATE TRIGGER trg_system_announcements_updated
  BEFORE UPDATE ON public.system_announcements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX IF NOT EXISTS idx_system_announcements_ativo_created ON public.system_announcements (ativo, created_at DESC);


-- Migration: 20260623051054_e6718961-945b-46c8-97e4-e34dbdac8b95.sql

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Garante que o usuário consiga ler o próprio tenant (necessário para exibir a logo no AppShell)
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
DROP POLICY IF EXISTS "Usuario le seu proprio tenant" ON public.tenants;
CREATE POLICY "Usuario le seu proprio tenant" ON public.tenants FOR SELECT
  TO authenticated
  USING (id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));


-- Migration: 20260623135546_8470bba8-f8d3-4c0b-a896-fb4cff5560c8.sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

-- Migration: 20260623141558_874d5054-636a-43f5-b311-5213c0b5f8c8.sql
-- Add 'teste' role to app_role enum for site signups (trial users)
-- [Consolidado no topo] ALTER TYPE ADD VALUE

-- Update handle_new_user trigger: site demo signups now get 'teste' role instead of 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
    -- Demo/site signup: recebe role 'teste' (acesso de avaliação por 48h)
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'teste');
  ELSIF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'executivo');
  END IF;
  RETURN NEW;
END $function$;

