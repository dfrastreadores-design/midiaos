ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'aguardando_assinatura';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'assinado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'enviar_opec';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'veiculado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'encerrado';
ALTER TYPE public.pi_status ADD VALUE IF NOT EXISTS 'finalizado';