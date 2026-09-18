-- Adicionar coluna briefing_id na tabela propostas para rastrear a origem
ALTER TABLE public.propostas ADD COLUMN IF NOT EXISTS briefing_id UUID REFERENCES public.briefings(id) ON DELETE SET NULL;

-- Atualizar a tabela de briefings para incluir o ID da proposta final (opcional, já que propostas -> briefing_id resolve)
-- Mas para facilitar a listagem no frontend, briefing.proposta_id é útil.
-- Já existe proposta_id em briefings (vimos no schema anterior), vamos apenas garantir que ele seja usado.

-- Aumentar o tamanho do campo de link nas notificações se necessário (opcional)
-- ALTER TABLE public.notificacoes ALTER COLUMN link TYPE TEXT;

GRANT ALL ON public.propostas TO authenticated;
GRANT ALL ON public.propostas TO service_role;
