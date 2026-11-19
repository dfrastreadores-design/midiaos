-- 1. Create briefings table
CREATE TABLE public.briefings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT NOT NULL DEFAULT 'pendente', -- pendente, em_producao, concluido, cancelado
    
    -- Client/Agency Info (to feed DB later)
    tipo_entidade TEXT NOT NULL CHECK (tipo_entidade IN ('cliente', 'agencia', 'ambos')),
    razao_social TEXT NOT NULL,
    nome_fantasia TEXT,
    cnpj TEXT,
    contato_nome TEXT,
    contato_email TEXT,
    contato_telefone TEXT,
    
    -- Briefing Details
    campanha TEXT NOT NULL,
    objetivo TEXT,
    periodo_estimado TEXT,
    verba_estimada NUMERIC,
    detalhes_adicionais TEXT,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES auth.users(id),
    proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. RLS & Permissions
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

-- Policies
CREATE POLICY "Users can view their own briefings" ON public.briefings
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Admins and Executives can view all briefings" ON public.briefings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'executivo')
        )
    );

CREATE POLICY "Users can create their own briefings" ON public.briefings
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own pending briefings" ON public.briefings
    FOR UPDATE USING (auth.uid() = created_by AND status = 'pendente');

CREATE POLICY "Admins and Executives can update any briefing" ON public.briefings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'executivo')
        )
    );

-- 3. Register permissions
INSERT INTO public.permissions (key, label, description) VALUES
('module.briefings', 'Briefings', 'Acesso ao módulo de Briefings')
ON CONFLICT (key) DO NOTHING;

-- 4. Role permissions setup
INSERT INTO public.role_permissions (role, permission_key) VALUES
('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column() 
RETURNS TRIGGER AS $$ 
BEGIN 
    NEW.updated_at = now(); 
    RETURN NEW; 
END; 
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_briefings_updated_at BEFORE UPDATE ON public.briefings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
