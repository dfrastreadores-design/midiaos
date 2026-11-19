ALTER TABLE public.pis ADD COLUMN IF NOT EXISTS producao_email TEXT;
ALTER TABLE public.solicitacoes_producao ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.pis.producao_email IS 'Email de contato para produção de material';
COMMENT ON COLUMN public.solicitacoes_producao.email IS 'Email de contato para a solicitação de produção';