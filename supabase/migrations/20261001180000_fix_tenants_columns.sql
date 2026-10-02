-- ==============================================================================
-- MIGRATION: 20261001180000_fix_tenants_columns.sql
-- DESCRIÇÃO: Adiciona colunas de personalização visual (cor_secundaria, cor_primaria, white-label) na tabela tenants
-- DIRETRIZ: Não destrutiva (IF NOT EXISTS), compatível com instâncias existentes
-- ==============================================================================

-- 1. Garante todas as colunas de White-Label e Customização na tabela tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cor_primaria TEXT DEFAULT '#0f172a',
  ADD COLUMN IF NOT EXISTS cor_secundaria TEXT DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS subdominio TEXT,
  ADD COLUMN IF NOT EXISTS dominio_proprio TEXT,
  ADD COLUMN IF NOT EXISTS prefixo_pi TEXT DEFAULT 'PI',
  ADD COLUMN IF NOT EXISTS prefixo_proposta TEXT DEFAULT 'PROP',
  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS favicon_url TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS produto_marca TEXT,
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
  ADD COLUMN IF NOT EXISTS modelos_proposta JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS limite_clientes INTEGER DEFAULT 500,
  ADD COLUMN IF NOT EXISTS limite_parceiros INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS limite_produtos INTEGER DEFAULT 1000;

-- 2. Recarregar o cache do PostgREST imediatamente para que a API reconheça as colunas novas
NOTIFY pgrst, 'reload schema';
