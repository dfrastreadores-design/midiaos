
CREATE TABLE public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'a_fazer' CHECK (status IN ('a_fazer','fazendo','concluido')),
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta')),
  prazo DATE,
  responsavel TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  agencia_id UUID REFERENCES public.agencias(id) ON DELETE SET NULL,
  pi_id UUID REFERENCES public.pis(id) ON DELETE SET NULL,
  proposta_id UUID REFERENCES public.propostas(id) ON DELETE SET NULL,
  projeto_id UUID REFERENCES public.projetos_especiais(id) ON DELETE SET NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT ALL ON public.tarefas TO service_role;

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia suas próprias tarefas"
  ON public.tarefas FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX tarefas_user_status_ordem_idx ON public.tarefas(user_id, status, ordem);

CREATE TRIGGER tarefas_touch_updated_at
  BEFORE UPDATE ON public.tarefas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
