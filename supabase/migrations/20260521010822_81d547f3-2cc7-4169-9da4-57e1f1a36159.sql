-- Reativar triggers que geram numero automático em propostas e pis
DROP TRIGGER IF EXISTS trg_propostas_numero ON public.propostas;
CREATE TRIGGER trg_propostas_numero
BEFORE INSERT ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.generate_proposta_numero();

DROP TRIGGER IF EXISTS trg_pis_numero ON public.pis;
CREATE TRIGGER trg_pis_numero
BEFORE INSERT ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.generate_pi_numero();

-- Garantir touch_updated_at em tabelas principais
DROP TRIGGER IF EXISTS trg_propostas_updated ON public.propostas;
CREATE TRIGGER trg_propostas_updated
BEFORE UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_pis_updated ON public.pis;
CREATE TRIGGER trg_pis_updated
BEFORE UPDATE ON public.pis
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();