CREATE TABLE public.midia_config (
  midia text PRIMARY KEY CHECK (midia IN ('TV','Radio','DOOH')),
  cnpj text,
  razao_social text,
  nome_fantasia text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  inscricao_estadual text,
  inscricao_municipal text,
  observacao text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.midia_config TO authenticated;
GRANT ALL ON public.midia_config TO service_role;

ALTER TABLE public.midia_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read midia_config" ON public.midia_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin upsert midia_config" ON public.midia_config FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "admin update midia_config" ON public.midia_config FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public.midia_config (midia) VALUES ('TV'), ('Radio'), ('DOOH') ON CONFLICT DO NOTHING;

CREATE TRIGGER touch_midia_config BEFORE UPDATE ON public.midia_config FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();