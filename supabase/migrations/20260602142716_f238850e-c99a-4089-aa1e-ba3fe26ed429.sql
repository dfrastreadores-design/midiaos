ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS assinatura_url TEXT;

CREATE TABLE IF NOT EXISTS public.pi_assinaturas_cliente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_id UUID NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','assinado','expirado')),
  nome_assinante TEXT,
  cpf TEXT,
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  assinado_em TIMESTAMPTZ,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pi_assin_pi ON public.pi_assinaturas_cliente(pi_id);
CREATE INDEX IF NOT EXISTS idx_pi_assin_token ON public.pi_assinaturas_cliente(token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_assinaturas_cliente TO authenticated;
GRANT ALL ON public.pi_assinaturas_cliente TO service_role;

ALTER TABLE public.pi_assinaturas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read pi_assin" ON public.pi_assinaturas_cliente
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert pi_assin" ON public.pi_assinaturas_cliente
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por);
CREATE POLICY "auth delete pi_assin" ON public.pi_assinaturas_cliente
  FOR DELETE TO authenticated USING (true);

CREATE POLICY "assin own read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own write" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin own delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'assinaturas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "assin admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()))
  WITH CHECK (bucket_id = 'assinaturas' AND public.is_admin(auth.uid()));