ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS permuta_detalhes TEXT;
ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS faturado BOOLEAN DEFAULT false;

-- Tabela para registrar o "pagamento" da permuta (o que a TV recebeu)
CREATE TABLE IF NOT EXISTS public.permuta_recebimentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID REFERENCES public.clientes(id),
  agencia_id UUID REFERENCES public.agencias(id),
  pi_id UUID REFERENCES public.pis(id),
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL DEFAULT 0,
  data_recebimento DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de saldos consolidados para facilitar a visualização
CREATE TABLE IF NOT EXISTS public.permuta_saldos (
  entidade_id UUID NOT NULL PRIMARY KEY, -- cliente_id ou agencia_id
  razao_social TEXT,
  tipo TEXT CHECK (tipo IN ('cliente', 'agencia')),
  total_pi NUMERIC(15,2) DEFAULT 0, -- Total de PIs marcados como permuta
  total_recebido NUMERIC(15,2) DEFAULT 0, -- Total de produtos/serviços recebidos
  saldo NUMERIC(15,2) GENERATED ALWAYS AS (total_pi - total_recebido) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.permuta_recebimentos TO authenticated;
GRANT ALL ON public.permuta_recebimentos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.permuta_saldos TO authenticated;
GRANT ALL ON public.permuta_saldos TO service_role;

ALTER TABLE public.permuta_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permuta_saldos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage permuta_recebimentos" ON public.permuta_recebimentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage permuta_saldos" ON public.permuta_saldos FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualizar saldos
CREATE OR REPLACE FUNCTION public.update_permuta_saldo() RETURNS TRIGGER AS $$
DECLARE
  v_entidade_id UUID;
  v_tipo TEXT;
  v_razao TEXT;
  v_total_pi NUMERIC;
  v_total_rec NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'pis' THEN
    v_entidade_id := COALESCE(NEW.cliente_id, NEW.agencia_id);
    IF NEW.cliente_id IS NOT NULL THEN v_tipo := 'cliente'; ELSE v_tipo := 'agencia'; END IF;
  ELSE
    v_entidade_id := COALESCE(NEW.cliente_id, NEW.agencia_id);
    IF NEW.cliente_id IS NOT NULL THEN v_tipo := 'cliente'; ELSE v_tipo := 'agencia'; END IF;
  END IF;

  IF v_entidade_id IS NULL THEN RETURN NEW; END IF;

  -- Busca razão social
  IF v_tipo = 'cliente' THEN
    SELECT razao_social INTO v_razao FROM public.clientes WHERE id = v_entidade_id;
  ELSE
    SELECT razao_social INTO v_razao FROM public.agencias WHERE id = v_entidade_id;
  END IF;

  -- Calcula totais
  SELECT COALESCE(SUM(valor_negociado), 0) INTO v_total_pi FROM public.pis 
  WHERE (cliente_id = v_entidade_id OR agencia_id = v_entidade_id) AND permuta = true AND status != 'cancelado';
  
  SELECT COALESCE(SUM(valor), 0) INTO v_total_rec FROM public.permuta_recebimentos 
  WHERE cliente_id = v_entidade_id OR agencia_id = v_entidade_id;

  INSERT INTO public.permuta_saldos (entidade_id, razao_social, tipo, total_pi, total_recebido, updated_at)
  VALUES (v_entidade_id, v_razao, v_tipo, v_total_pi, v_total_rec, now())
  ON CONFLICT (entidade_id) DO UPDATE SET
    razao_social = EXCLUDED.razao_social,
    total_pi = EXCLUDED.total_pi,
    total_recebido = EXCLUDED.total_recebido,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_saldo_pi AFTER INSERT OR UPDATE OR DELETE ON public.pis FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();
CREATE TRIGGER trigger_update_saldo_rec AFTER INSERT OR UPDATE OR DELETE ON public.permuta_recebimentos FOR EACH ROW EXECUTE FUNCTION public.update_permuta_saldo();

-- Adiciona permissão
INSERT INTO public.permissions (key, label, description) 
VALUES ('/permuta', 'Controle de Permuta', 'Gerenciamento de saldos e recebimentos de permuta')
ON CONFLICT (key) DO NOTHING;
