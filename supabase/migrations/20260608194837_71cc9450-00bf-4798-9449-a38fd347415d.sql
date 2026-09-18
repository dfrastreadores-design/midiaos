CREATE TABLE public.pi_financeiro (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  nota_fiscal_numero text,
  nota_fiscal_path text,
  boleto_path text,
  vencimento_boleto date,
  valor numeric,
  status_pagamento text NOT NULL DEFAULT 'pendente',
  data_pagamento date,
  observacoes text,
  criado_por uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pi_financeiro_pi_id ON public.pi_financeiro(pi_id);
CREATE INDEX idx_pi_financeiro_status ON public.pi_financeiro(status_pagamento);
CREATE INDEX idx_pi_financeiro_vencimento ON public.pi_financeiro(vencimento_boleto);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_financeiro TO authenticated;
GRANT ALL ON public.pi_financeiro TO service_role;

ALTER TABLE public.pi_financeiro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pi_financeiro"
  ON public.pi_financeiro FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert pi_financeiro"
  ON public.pi_financeiro FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update pi_financeiro"
  ON public.pi_financeiro FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete pi_financeiro"
  ON public.pi_financeiro FOR DELETE TO authenticated USING (true);

CREATE TRIGGER touch_pi_financeiro_updated_at
  BEFORE UPDATE ON public.pi_financeiro
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage policies for the bucket (bucket created via tool)
CREATE POLICY "Authenticated users can view financeiro docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can upload financeiro docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can update financeiro docs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'financeiro-docs');

CREATE POLICY "Authenticated users can delete financeiro docs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'financeiro-docs');