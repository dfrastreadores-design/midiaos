-- Cria a tabela de tipos de produtos
CREATE TABLE public.produto_tipos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    midia TEXT NOT NULL CHECK (midia IN ('TV', 'Radio', 'DOOH')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(nome, midia)
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produto_tipos TO authenticated;
GRANT ALL ON public.produto_tipos TO service_role;

-- Habilita RLS
ALTER TABLE public.produto_tipos ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Qualquer usuário autenticado pode ver os tipos" ON public.produto_tipos
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Apenas admins podem gerenciar os tipos" ON public.produto_tipos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Insere tipos padrão (sugeridos no código anterior)
INSERT INTO public.produto_tipos (nome, midia) VALUES 
('VT', 'TV'),
('Merchan', 'TV'),
('Insert', 'TV'),
('Patrocínio', 'TV'),
('Projeto Especial', 'TV'),
('Spot', 'Radio'),
('Jingle', 'Radio'),
('Painel', 'DOOH');