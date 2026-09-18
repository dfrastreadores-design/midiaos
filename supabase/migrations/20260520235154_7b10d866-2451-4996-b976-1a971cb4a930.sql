-- ====== Produtos (TV / Rádio / DOOH) ======
DO $$ BEGIN
  CREATE TYPE public.midia_tipo AS ENUM ('TV', 'Radio', 'DOOH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  midia public.midia_tipo NOT NULL,
  tipo text,
  programa text,
  faixa text,
  duracao_segundos integer NOT NULL DEFAULT 30,
  insercoes_padrao integer NOT NULL DEFAULT 1,
  valor_unit numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert produtos" ON public.produtos
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin update produtos" ON public.produtos
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin delete produtos" ON public.produtos
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER produtos_touch BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ====== Metas por executivo ======
CREATE TABLE IF NOT EXISTS public.metas_executivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executivo_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  valor_meta numeric NOT NULL DEFAULT 0,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (executivo_id, ano, mes)
);

ALTER TABLE public.metas_executivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read metas" ON public.metas_executivo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin insert metas" ON public.metas_executivo
  FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admin update metas" ON public.metas_executivo
  FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "admin delete metas" ON public.metas_executivo
  FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));

CREATE TRIGGER metas_touch BEFORE UPDATE ON public.metas_executivo
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();