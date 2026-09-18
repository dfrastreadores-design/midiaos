
ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS quantidade_telas integer,
  ADD COLUMN IF NOT EXISTS ambientes text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS formato_tela text,
  ADD COLUMN IF NOT EXISTS resolucao text,
  ADD COLUMN IF NOT EXISTS tempo_exibicao_segundos integer,
  ADD COLUMN IF NOT EXISTS loop_minutos integer,
  ADD COLUMN IF NOT EXISTS insercoes_por_hora integer,
  ADD COLUMN IF NOT EXISTS horas_operacao_dia integer,
  ADD COLUMN IF NOT EXISTS detalhes_venda text;
