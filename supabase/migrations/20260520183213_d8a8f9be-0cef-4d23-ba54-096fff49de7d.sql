-- ENUMs
DO $$ BEGIN
  CREATE TYPE public.proposta_status AS ENUM ('rascunho','enviada','aprovada','recusada','convertida');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Sequência para numeração
CREATE SEQUENCE IF NOT EXISTS public.proposta_seq START 1;

-- Tabela principal
CREATE TABLE IF NOT EXISTS public.propostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL UNIQUE,
  cliente_id UUID,
  agencia_id UUID,
  campanha TEXT NOT NULL,
  validade DATE,
  observacao TEXT,
  status public.proposta_status NOT NULL DEFAULT 'rascunho',
  valor_tabela NUMERIC NOT NULL DEFAULT 0,
  valor_desconto NUMERIC NOT NULL DEFAULT 0,
  valor_negociado NUMERIC NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  comissao_pct NUMERIC NOT NULL DEFAULT 0,
  pi_id UUID,
  executivo_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens da proposta
CREATE TABLE IF NOT EXISTS public.proposta_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  programa TEXT,
  formato TEXT,
  insercoes_dia INT NOT NULL DEFAULT 1,
  dias_semana TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  dias_mes INT[] NOT NULL DEFAULT ARRAY[]::int[],
  desconto NUMERIC NOT NULL DEFAULT 0,
  valor_unit NUMERIC NOT NULL DEFAULT 0,
  valor_tabela NUMERIC NOT NULL DEFAULT 0,
  valor_negociado NUMERIC NOT NULL DEFAULT 0,
  total_insercoes INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger de numeração
CREATE OR REPLACE FUNCTION public.generate_proposta_numero()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE yr TEXT := to_char(now(),'YYYY'); n BIGINT;
BEGIN
  IF NEW.numero IS NULL OR NEW.numero = '' THEN
    n := nextval('public.proposta_seq');
    NEW.numero := 'PROP-' || yr || '-' || lpad(n::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_proposta_numero ON public.propostas;
CREATE TRIGGER trg_proposta_numero BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_proposta_touch ON public.propostas;
CREATE TRIGGER trg_proposta_touch BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read propostas" ON public.propostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert propostas" ON public.propostas FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth update propostas" ON public.propostas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "admin delete propostas" ON public.propostas FOR DELETE TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "auth read proposta_itens" ON public.proposta_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write proposta_itens" ON public.proposta_itens FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);