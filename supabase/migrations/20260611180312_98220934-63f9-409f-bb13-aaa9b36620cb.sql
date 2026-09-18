-- Adiciona coluna status à tabela de clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.clientes.status IS 'Status do cliente: ativo, inativo, prospect, bloqueado';

-- Adiciona coluna status à tabela de agencias
ALTER TABLE public.agencias ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo';
COMMENT ON COLUMN public.agencias.status IS 'Status da agência: ativa, inativa, bloqueada';
