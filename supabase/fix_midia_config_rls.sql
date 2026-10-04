-- ==============================================================================
-- SCRIPT DE CORREÇÃO: PERMISSÕES DE CADASTRO DE MÍDIAS (RLS & CONSTRAINTS)
-- Execute este script no SQL Editor do Supabase para liberar o cadastro de mídias
-- ==============================================================================

-- 1. Remove qualquer restrição CHECK que limite os valores de midia
DO $$
BEGIN
  ALTER TABLE public.midia_config DROP CONSTRAINT IF EXISTS midia_config_midia_check;
  ALTER TABLE public.midia_config DROP CONSTRAINT IF EXISTS check_midia;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 2. Converte coluna midia para text puro garantindo suporte dinâmico
DO $$
BEGIN
  ALTER TABLE public.midia_config ALTER COLUMN midia TYPE text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 3. Adiciona tenant_id se aplicável (opcional e seguro)
ALTER TABLE public.midia_config ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

-- 4. Atualiza as políticas de RLS para permitir que qualquer usuário autenticado gerencie mídias
DROP POLICY IF EXISTS "auth read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "admin update midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated read midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated upsert midia_config" ON public.midia_config;
DROP POLICY IF EXISTS "authenticated update midia_config" ON public.midia_config;

CREATE POLICY "authenticated read midia_config" ON public.midia_config
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated upsert midia_config" ON public.midia_config
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "authenticated update midia_config" ON public.midia_config
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Garante permissões completas
GRANT ALL ON public.midia_config TO authenticated;
GRANT ALL ON public.midia_config TO service_role;

-- 6. Remove restrição CHECK de produto_tipos para permitir criação de tipos de qualquer mídia
DO $$
BEGIN
  ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS produto_tipos_midia_check;
  ALTER TABLE public.produto_tipos DROP CONSTRAINT IF EXISTS check_midia;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.produto_tipos ALTER COLUMN midia TYPE text;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

GRANT ALL ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;

