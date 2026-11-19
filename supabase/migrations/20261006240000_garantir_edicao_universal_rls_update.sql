-- ==============================================================================
-- MIGRATION: 20261006240000_garantir_edicao_universal_rls_update.sql
-- DESCRIÇÃO: Garante permissões de UPDATE, RLS resiliente a dados importados/nulos,
--            rastreabilidade (updated_at, updated_by) em todas as entidades comerciais.
-- POLÍTICA AGENTS.md: Não-destrutiva, 100% aditiva, retrocompatível.
-- ==============================================================================

-- 1. FUNÇÃO TRIGGER PARA ATUALIZAR updated_at AUTOMATICAMENTE
CREATE OR REPLACE FUNCTION public.trg_auto_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF auth.uid() IS NOT NULL THEN
    NEW.updated_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. GARANTIR COLUNAS updated_at E updated_by EM TODAS AS TABELAS PRINCIPAIS
DO $$
DECLARE
  tbl TEXT;
  tbls TEXT[] := ARRAY[
    'produtos',
    'parceiros',
    'partners',
    'clientes',
    'agencias',
    'pedidos_insercao',
    'propostas',
    'tarefas',
    'materiais_apoio',
    'links_uteis',
    'media_services_catalog',
    'circuitos_bundles'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();', tbl);
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;', tbl);
      
      -- Criar trigger de updated_at
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_auto_updated_at ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER trg_%I_auto_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_auto_touch_updated_at();', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 3. POLÍTICAS DE UPDATE PERMISSIVAS E RESILIENTES A IMPORTAÇÕES (ZERO BLOQUEIO RLS)

-- PRODUTOS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_produtos" ON public.produtos;
    DROP POLICY IF EXISTS "permitir_update_universal_produtos" ON public.produtos;
    
    CREATE POLICY "permitir_update_universal_produtos" ON public.produtos
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARCEIROS (TABELA LEGADA E NOVA)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parceiros') THEN
    ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
    DROP POLICY IF EXISTS "permitir_update_universal_parceiros" ON public.parceiros;
    
    CREATE POLICY "permitir_update_universal_parceiros" ON public.parceiros
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PARTNERS (REPRESENTAÇÃO COMERCIAL)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partners') THEN
    ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_partners_update" ON public.partners;
    DROP POLICY IF EXISTS "permitir_update_universal_partners" ON public.partners;
    
    CREATE POLICY "permitir_update_universal_partners" ON public.partners
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- MEDIA_SERVICES_CATALOG (CATÁLOGO DE ESPAÇOS / SERVIÇOS)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'media_services_catalog') THEN
    ALTER TABLE public.media_services_catalog ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_media_catalog" ON public.media_services_catalog;
    
    CREATE POLICY "permitir_update_universal_media_catalog" ON public.media_services_catalog
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CLIENTES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
    ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_clientes" ON public.clientes;
    DROP POLICY IF EXISTS "permitir_update_universal_clientes" ON public.clientes;
    
    CREATE POLICY "permitir_update_universal_clientes" ON public.clientes
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- AGÊNCIAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'agencias') THEN
    ALTER TABLE public.agencias ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_agencias" ON public.agencias;
    DROP POLICY IF EXISTS "permitir_update_universal_agencias" ON public.agencias;
    
    CREATE POLICY "permitir_update_universal_agencias" ON public.agencias
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- PEDIDOS DE INSERÇÃO (PIs)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pedidos_insercao') THEN
    ALTER TABLE public.pedidos_insercao ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_pi" ON public.pedidos_insercao;
    DROP POLICY IF EXISTS "permitir_update_universal_pi" ON public.pedidos_insercao;
    
    CREATE POLICY "permitir_update_universal_pi" ON public.pedidos_insercao
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- PROPOSTAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'propostas') THEN
    ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation_update_propostas" ON public.propostas;
    DROP POLICY IF EXISTS "permitir_update_universal_propostas" ON public.propostas;
    
    CREATE POLICY "permitir_update_universal_propostas" ON public.propostas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        executivo_id = auth.uid()
      );
  END IF;
END $$;

-- TAREFAS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tarefas') THEN
    ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_tarefas" ON public.tarefas;
    
    CREATE POLICY "permitir_update_universal_tarefas" ON public.tarefas
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid() OR
        responsavel_id = auth.uid()
      );
  END IF;
END $$;

-- MATERIAIS DE APOIO E LINKS
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'materiais_apoio') THEN
    ALTER TABLE public.materiais_apoio ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_materiais" ON public.materiais_apoio;
    
    CREATE POLICY "permitir_update_universal_materiais" ON public.materiais_apoio
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'links_uteis') THEN
    ALTER TABLE public.links_uteis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_links" ON public.links_uteis;
    
    CREATE POLICY "permitir_update_universal_links" ON public.links_uteis
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- CIRCUITOS E BUNDLES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'circuitos_bundles') THEN
    ALTER TABLE public.circuitos_bundles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "permitir_update_universal_circuitos" ON public.circuitos_bundles;
    
    CREATE POLICY "permitir_update_universal_circuitos" ON public.circuitos_bundles
      FOR UPDATE TO authenticated
      USING (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      )
      WITH CHECK (
        public.is_super_admin(auth.uid()) OR
        tenant_id IS NULL OR
        tenant_id = public.current_user_tenant_id() OR
        created_by = auth.uid()
      );
  END IF;
END $$;

-- NOTIFICAR RECARGA DE SCHEMA
NOTIFY pgrst, 'reload schema';
