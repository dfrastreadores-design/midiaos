-- ==============================================================================
-- MIGRATION: 20261002120000_proposta_itens_parceiro.sql
-- DESCRIÇÃO: Vínculo explícito de produtos ao Parceiro (CNPJ, Nome, ID e Comissão)
--            nas tabelas de itens de proposta (proposta_itens) e itens de PI (pi_itens).
-- POLÍTICA: Zero perda de dados, puramente aditivo com IF NOT EXISTS.
-- ==============================================================================

DO $$
BEGIN
  -- 1. Campos em public.proposta_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_id') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_nome') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_nome text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'parceiro_cnpj') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN parceiro_cnpj text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'comissao_inquilino_pct') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN comissao_inquilino_pct numeric(5,2);
  END IF;

  -- 2. Campos em public.pi_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_id') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_nome') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_nome text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'parceiro_cnpj') THEN
    ALTER TABLE public.pi_itens ADD COLUMN parceiro_cnpj text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pi_itens' AND column_name = 'comissao_inquilino_pct') THEN
    ALTER TABLE public.pi_itens ADD COLUMN comissao_inquilino_pct numeric(5,2);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposta_itens_parceiro_cnpj ON public.proposta_itens(parceiro_cnpj);
CREATE INDEX IF NOT EXISTS idx_pi_itens_parceiro_cnpj ON public.pi_itens(parceiro_cnpj);
