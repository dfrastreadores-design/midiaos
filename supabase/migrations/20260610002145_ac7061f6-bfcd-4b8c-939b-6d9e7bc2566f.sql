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
CREATE POLICY "Usuários autenticados podem ver solicitações" ON public.solicitacoes_producao FOR SELECT TO authenticated USING (true);
CREATE POLICY "Executivos e Admin podem gerenciar solicitações" ON public.solicitacoes_producao FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_solicitacoes_producao_updated_at
BEFORE UPDATE ON public.solicitacoes_producao
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
