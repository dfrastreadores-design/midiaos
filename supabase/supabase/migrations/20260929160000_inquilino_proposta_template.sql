-- ==============================================================================
-- MIGRATION: 20260929160000_inquilino_proposta_template.sql
-- DESCRIÇÃO: Suporte a modelo próprio de apresentação/proposta por inquilino,
--            armazenamento de slides importados e mapeamento de onde inserir produtos e valores.
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Colunas adicionais na tabela public.proposta_layouts
ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS slides JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.proposta_layouts 
  ADD COLUMN IF NOT EXISTS mapeamento JSONB DEFAULT '{}'::jsonb;

-- Índice para busca rápida de templates por inquilino
CREATE INDEX IF NOT EXISTS idx_proposta_layouts_tenant 
  ON public.proposta_layouts (tenant_id, is_default);

-- 2. Criação do bucket de storage 'proposta-templates' para armazenar os slides dos inquilinos
INSERT INTO storage.buckets (id, name, public)
VALUES ('proposta-templates', 'proposta-templates', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de acesso para o bucket proposta-templates
DROP POLICY IF EXISTS "proposta-templates public read" ON storage.objects;
CREATE POLICY "proposta-templates public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth insert" ON storage.objects;
CREATE POLICY "proposta-templates auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth update" ON storage.objects;
CREATE POLICY "proposta-templates auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'proposta-templates');

DROP POLICY IF EXISTS "proposta-templates auth delete" ON storage.objects;
CREATE POLICY "proposta-templates auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'proposta-templates');

-- 4. Ajuste de RLS em proposta_layouts para isolamento por tenant
DROP POLICY IF EXISTS "Authenticated users can view layouts" ON public.proposta_layouts;
CREATE POLICY "Authenticated users can view layouts" ON public.proposta_layouts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      tenant_id IS NULL OR 
      tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins and diretoria can manage layouts" ON public.proposta_layouts;
CREATE POLICY "Admins and diretoria can manage layouts" ON public.proposta_layouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'diretoria')
    )
  );
