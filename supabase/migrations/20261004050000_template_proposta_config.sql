-- ====================================================================
-- MIGRAÇÃO: Configurações de Template de Proposta por Organização / White-Label
-- Data: Outubro de 2026
-- ====================================================================

-- 1. Tabela de Configurações de Template de Proposta por Assinante/Organização
CREATE TABLE IF NOT EXISTS public.template_proposta_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizacao_id UUID REFERENCES public.organizacoes(id) ON DELETE CASCADE,
    logo_url TEXT,
    cor_fundo_capa TEXT DEFAULT '#0b0c10',
    cor_destaque_primaria TEXT DEFAULT '#ff6b00', -- Laranja Nexo
    cor_destaque_secundaria TEXT DEFAULT '#7928ca', -- Roxo/Degradê Nexo
    telefone_contato TEXT DEFAULT '(61) 99125-7245',
    email_contato TEXT DEFAULT 'rafaelnexomidia@gmail.com',
    instagram_contato TEXT DEFAULT 'nexobrasilmidia',
    site_url TEXT DEFAULT 'https://nexomidiaerepresentacao.com.br',
    
    -- Seções editáveis do template
    manifesto_titulo TEXT DEFAULT 'O significado de Nexo',
    manifesto_texto TEXT DEFAULT 'No dicionário, nexo significa conexão, ligação, vínculo entre partes...',
    exibir_overview BOOLEAN DEFAULT true,
    exibir_metodologia BOOLEAN DEFAULT true,
    exibir_mapa_satelite BOOLEAN DEFAULT true,
    
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organizacao_id)
);

-- Habilitar RLS e Políticas
ALTER TABLE public.template_proposta_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de template_proposta_config para autenticados e publico"
ON public.template_proposta_config FOR SELECT
USING (true);

CREATE POLICY "Permitir update de template_proposta_config para administradores"
ON public.template_proposta_config FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.organizacao_id = template_proposta_config.organizacao_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (p.is_super_admin = true OR p.organizacao_id = template_proposta_config.organizacao_id)
  )
);

-- 2. Vincular as configurações à organização Nexo existente
INSERT INTO public.template_proposta_config (
    organizacao_id, 
    logo_url, 
    cor_fundo_capa, 
    cor_destaque_primaria, 
    cor_destaque_secundaria,
    telefone_contato,
    email_contato,
    instagram_contato,
    site_url,
    manifesto_titulo,
    manifesto_texto,
    exibir_overview,
    exibir_metodologia,
    exibir_mapa_satelite
)
SELECT 
    id, 
    logo_url, 
    '#0b0c10', 
    '#ff6b00', 
    '#7928ca',
    '(61) 99125-7245',
    'rafaelnexomidia@gmail.com',
    'nexobrasilmidia',
    'https://nexomidiaerepresentacao.com.br',
    'O significado de Nexo',
    'No dicionário, nexo significa conexão, ligação, vínculo entre partes. No mercado de comunicação do Distrito Federal e entorno, a Nexo Mídia e Representação é a ponte estratégica que une marcas, veículos de alto impacto e consumidores em momentos decisivos da sua jornada diária.',
    true,
    true,
    true
FROM public.organizacoes 
WHERE slug = 'nexo'
ON CONFLICT (organizacao_id) DO UPDATE SET
    cor_fundo_capa = EXCLUDED.cor_fundo_capa,
    cor_destaque_primaria = EXCLUDED.cor_destaque_primaria,
    cor_destaque_secundaria = EXCLUDED.cor_destaque_secundaria,
    telefone_contato = EXCLUDED.telefone_contato,
    email_contato = EXCLUDED.email_contato,
    instagram_contato = EXCLUDED.instagram_contato,
    site_url = EXCLUDED.site_url,
    manifesto_titulo = EXCLUDED.manifesto_titulo,
    manifesto_texto = EXCLUDED.manifesto_texto,
    updated_at = now();
