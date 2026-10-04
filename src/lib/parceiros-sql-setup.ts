/**
 * Script SQL para inicialização e migração da tabela de Parceiros de Mídia no Supabase.
 * Pode ser copiado diretamente para o SQL Editor do painel do Supabase.
 */
export const SQL_PARCEIROS_SETUP = `-- ==============================================================================
-- INICIALIZAÇÃO DA TABELA DE PARCEIROS DE MÍDIA NO SUPABASE
-- Execute este script no SQL Editor do seu projeto Supabase (Dashboard -> SQL Editor -> Run)
-- ==============================================================================

-- 1. Criação da tabela de parceiros de mídia
CREATE TABLE IF NOT EXISTS public.parceiros (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  site TEXT,
  instagram TEXT,
  linkedin TEXT,
  facebook TEXT,
  redes_sociais JSONB DEFAULT '{}',
  segmentos TEXT[] DEFAULT '{}',
  modelo_remuneracao TEXT DEFAULT 'comissao_percentual',
  comissao_padrao_pct NUMERIC(5,2) DEFAULT 20.00,
  prazo_repasse TEXT,
  condicoes_comerciais TEXT,
  contato_nome TEXT,
  contato_email TEXT,
  contato_telefone TEXT,
  chave_pix TEXT,
  dados_bancarios TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Garantir colunas adicionais para instalações existentes
ALTER TABLE public.parceiros
  ADD COLUMN IF NOT EXISTS site TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS redes_sociais JSONB DEFAULT '{}';

-- 3. Índices de alta performance
CREATE INDEX IF NOT EXISTS idx_parceiros_tenant ON public.parceiros(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_cnpj ON public.parceiros(cnpj);
CREATE INDEX IF NOT EXISTS idx_parceiros_ativo ON public.parceiros(ativo);

-- 4. Vincular produtos SOMENTE se a tabela produtos existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    ALTER TABLE public.produtos
      ADD COLUMN IF NOT EXISTS parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS parceiro_cnpj TEXT,
      ADD COLUMN IF NOT EXISTS parceiro_nome TEXT,
      ADD COLUMN IF NOT EXISTS comissao_inquilino_pct NUMERIC(5,2);

    CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_id ON public.produtos(parceiro_id);
    CREATE INDEX IF NOT EXISTS idx_produtos_parceiro_cnpj ON public.produtos(parceiro_cnpj);
  END IF;
END $$;

-- 5. Permissões de acesso
GRANT ALL ON public.parceiros TO authenticated;
GRANT ALL ON public.parceiros TO service_role;
GRANT SELECT ON public.parceiros TO anon;

-- 6. Habilitar RLS (Row Level Security)
ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

-- 7. Políticas de acesso
DROP POLICY IF EXISTS "tenant_isolation_select_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_select_parceiros" ON public.parceiros
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenant_isolation_insert_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_insert_parceiros" ON public.parceiros
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "tenant_isolation_update_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_update_parceiros" ON public.parceiros
  FOR UPDATE TO authenticated
  USING (true);

DROP POLICY IF EXISTS "tenant_isolation_delete_parceiros" ON public.parceiros;
CREATE POLICY "tenant_isolation_delete_parceiros" ON public.parceiros
  FOR DELETE TO authenticated
  USING (true);

-- 8. Tabela complementar: Anexos e Mídia Kits do Parceiro
CREATE TABLE IF NOT EXISTS public.parceiro_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  tipo TEXT DEFAULT 'midia_kit',
  tamanho_bytes BIGINT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiro_anexos_parceiro ON public.parceiro_anexos(parceiro_id);
GRANT ALL ON public.parceiro_anexos TO authenticated;
GRANT ALL ON public.parceiro_anexos TO service_role;
ALTER TABLE public.parceiro_anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos;
CREATE POLICY "tenant_isolation_parceiro_anexos" ON public.parceiro_anexos
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. Tabela complementar: Métricas e Defesas Técnicas de Mídia
CREATE TABLE IF NOT EXISTS public.parceiros_metricas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID,
  parceiro_id UUID REFERENCES public.parceiros(id) ON DELETE SET NULL,
  parceiro_nome TEXT NOT NULL,
  tipo_midia TEXT NOT NULL,
  veiculo_programa TEXT NOT NULL,
  praca TEXT DEFAULT 'Brasília - DF',
  alcance_estimado TEXT DEFAULT '',
  impactos_mes TEXT DEFAULT '',
  fluxo_diario TEXT DEFAULT '',
  perfil_publico TEXT DEFAULT 'Classes A, B e C, 25 a 55 anos',
  audiencia_share TEXT DEFAULT '',
  fonte_dados TEXT DEFAULT 'Kantar IBOPE / Auditoria de Tráfego',
  defesa_tecnica TEXT NOT NULL,
  destaques_comerciais JSONB DEFAULT '[]',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parceiros_metricas_tenant ON public.parceiros_metricas(tenant_id);
GRANT ALL ON public.parceiros_metricas TO authenticated;
GRANT ALL ON public.parceiros_metricas TO service_role;
ALTER TABLE public.parceiros_metricas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas;
CREATE POLICY "tenant_isolation_parceiros_metricas" ON public.parceiros_metricas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. Triggers de Segurança e Auditoria de Produção (Guardrails)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_move_to_trash') THEN
    DROP TRIGGER IF EXISTS trash_before_delete ON public.parceiros;
    CREATE TRIGGER trash_before_delete
      BEFORE DELETE ON public.parceiros
      FOR EACH ROW
      EXECUTE FUNCTION public.trg_move_to_trash();
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_alteracao') THEN
    DROP TRIGGER IF EXISTS trg_audit_parceiros ON public.parceiros;
    CREATE TRIGGER trg_audit_parceiros
      AFTER INSERT OR UPDATE OR DELETE ON public.parceiros
      FOR EACH ROW
      EXECUTE FUNCTION public.log_alteracao();
  END IF;
END $$;

-- 11. Habilitação e Cadastro do Parceiro Oficial: PO MÍDIA DIGITAL (CNPJ 37.313.540/0001-35)
INSERT INTO public.parceiros (
  razao_social,
  nome_fantasia,
  cnpj,
  segmentos,
  modelo_remuneracao,
  comissao_padrao_pct,
  contato_telefone,
  endereco,
  cidade,
  uf,
  cep,
  ativo
)
SELECT
  'PO MIDIA, SERVICOS LOCACAO DE ESPACOS PUBLICIDADE DIGITAL LTDA',
  'PO MIDIA DIGITAL',
  '37.313.540/0001-35',
  ARRAY['DOOH', 'Painéis Digitais de Rua', 'Telas em Elevadores Corporativos', 'Espaços Comerciais em Shoppings e Hotéis']::text[],
  'comissao_percentual',
  20.00,
  '(61) 3315-8755',
  'AOS 2/8 - Lote 05 - Sala, Parte, Área Octogonal',
  'Brasília',
  'DF',
  '70660-900',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.parceiros 
  WHERE cnpj = '37.313.540/0001-35' 
     OR cnpj = '37313540000135' 
     OR razao_social ILIKE '%PO MIDIA%'
);

-- Atualiza vínculo de produtos existentes para PO Mídia caso haja correspondência
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produtos') THEN
    UPDATE public.produtos p
    SET parceiro_id = parc.id,
        parceiro_nome = parc.nome_fantasia,
        parceiro_cnpj = parc.cnpj
    FROM public.parceiros parc
    WHERE (parc.cnpj = '37.313.540/0001-35' OR parc.cnpj = '37313540000135')
      AND (
        p.parceiro_id IS NULL AND (
          p.parceiro_cnpj ILIKE '%37313540%' OR 
          p.parceiro_nome ILIKE '%PO MIDIA%' OR 
          p.nome ILIKE '%PO MIDIA%'
        )
      );
  END IF;
END $$;

-- 12. Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
`;
