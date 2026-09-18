CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings" ON public.system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can view system settings" ON public.system_settings
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tabela para layouts de proposta
CREATE TABLE IF NOT EXISTS public.proposta_layouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    config JSONB NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposta_layouts TO authenticated;
GRANT ALL ON public.proposta_layouts TO service_role;

ALTER TABLE public.proposta_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage layouts" ON public.proposta_layouts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Authenticated users can view layouts" ON public.proposta_layouts
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Adiciona coluna de layout_id na proposta
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS layout_id UUID REFERENCES public.proposta_layouts(id);
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS custom_config JSONB; -- Para ajustes específicos de uma única proposta

-- Trigger para garantir que apenas um layout seja default
CREATE OR REPLACE FUNCTION handle_default_layout() 
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default THEN
        UPDATE public.proposta_layouts SET is_default = false WHERE id <> NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_default_layout
BEFORE INSERT OR UPDATE OF is_default ON public.proposta_layouts
FOR EACH ROW WHEN (NEW.is_default = true)
EXECUTE FUNCTION handle_default_layout();