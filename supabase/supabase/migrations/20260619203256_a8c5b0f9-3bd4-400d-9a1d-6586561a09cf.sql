
CREATE TABLE public.influenciadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'influenciador',
  nicho TEXT,
  cidade TEXT,
  estado TEXT,
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  tiktok TEXT,
  youtube TEXT,
  facebook TEXT,
  twitter TEXT,
  outras_redes TEXT,
  seguidores_total BIGINT,
  cache_valor NUMERIC(14,2),
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.influenciadores TO authenticated;
GRANT ALL ON public.influenciadores TO service_role;

ALTER TABLE public.influenciadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e producao podem ver influenciadores"
  ON public.influenciadores FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem inserir influenciadores"
  ON public.influenciadores FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem atualizar influenciadores"
  ON public.influenciadores FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE POLICY "Admin e producao podem excluir influenciadores"
  ON public.influenciadores FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'producao'));

CREATE TRIGGER influenciadores_updated_at
  BEFORE UPDATE ON public.influenciadores
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
