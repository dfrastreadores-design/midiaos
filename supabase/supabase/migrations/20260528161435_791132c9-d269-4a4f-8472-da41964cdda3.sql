
-- Table
CREATE TABLE public.pi_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NULL,
  agencia_id uuid NULL,
  pi_id uuid NULL,
  titulo text NOT NULL,
  descricao text NULL,
  periodo_referencia text NULL,
  arquivo_nome text NOT NULL,
  arquivo_path text NOT NULL,
  arquivo_tipo text NULL,
  arquivo_tamanho bigint NULL,
  created_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_anexos TO authenticated;
GRANT ALL ON public.pi_anexos TO service_role;

ALTER TABLE public.pi_anexos ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pi_anexos_cliente ON public.pi_anexos(cliente_id);
CREATE INDEX idx_pi_anexos_agencia ON public.pi_anexos(agencia_id);
CREATE INDEX idx_pi_anexos_pi ON public.pi_anexos(pi_id);

CREATE TRIGGER trg_pi_anexos_updated_at
BEFORE UPDATE ON public.pi_anexos
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Read: admin, criador, ou tem acesso ao cliente/agência/pi vinculado
CREATE POLICY "read pi_anexos"
ON public.pi_anexos FOR SELECT TO authenticated
USING (
  is_admin(auth.uid())
  OR created_by = auth.uid()
  OR (cliente_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = pi_anexos.cliente_id
      AND (c.executivo_id = auth.uid() OR c.created_by = auth.uid())
  ))
  OR (agencia_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.agencias a
    WHERE a.id = pi_anexos.agencia_id
      AND (a.executivo_id = auth.uid() OR a.created_by = auth.uid())
  ))
  OR (pi_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.pis p
    WHERE p.id = pi_anexos.pi_id
      AND (p.executivo_id = auth.uid() OR p.created_by = auth.uid())
  ))
);

CREATE POLICY "insert pi_anexos"
ON public.pi_anexos FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "update pi_anexos"
ON public.pi_anexos FOR UPDATE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid())
WITH CHECK (is_admin(auth.uid()) OR created_by = auth.uid());

CREATE POLICY "delete pi_anexos"
ON public.pi_anexos FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR created_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pi-anexos', 'pi-anexos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "pi-anexos read auth"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'pi-anexos');

CREATE POLICY "pi-anexos insert auth"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'pi-anexos' AND auth.uid() IS NOT NULL);

CREATE POLICY "pi-anexos delete owner/admin"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'pi-anexos' AND (is_admin(auth.uid()) OR owner = auth.uid()));
