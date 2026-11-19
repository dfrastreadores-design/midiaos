-- ==============================================================================
-- MIGRATION: 20260929140000_produtos_fotos.sql
-- DESCRIÇÃO: Suporte a até 2 fotos por produto (fotos text[]) e bucket produto-fotos
-- DATA: 2026-09-29
-- ==============================================================================

-- 1. Adiciona a coluna fotos na tabela public.produtos
ALTER TABLE public.produtos 
  ADD COLUMN IF NOT EXISTS fotos text[] DEFAULT '{}';

COMMENT ON COLUMN public.produtos.fotos IS 'Fotos do produto/ponto de exibição (máximo 2 fotos para vitrine, proposta e PI)';

-- 2. Criação do bucket produto-fotos caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('produto-fotos', 'produto-fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas de acesso para o bucket produto-fotos
DROP POLICY IF EXISTS "produto-fotos public read" ON storage.objects;
CREATE POLICY "produto-fotos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth insert" ON storage.objects;
CREATE POLICY "produto-fotos auth insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth update" ON storage.objects;
CREATE POLICY "produto-fotos auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'produto-fotos');

DROP POLICY IF EXISTS "produto-fotos auth delete" ON storage.objects;
CREATE POLICY "produto-fotos auth delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'produto-fotos');
