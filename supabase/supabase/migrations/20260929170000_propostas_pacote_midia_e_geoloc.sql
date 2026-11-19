-- Migration 20260929170000_propostas_pacote_midia_e_geoloc.sql
-- Adiciona opções de apresentação comercial (Detalhado com Geolocalização/Endereço/Fotos vs Pacote de Mídia)

DO $$ 
BEGIN
  -- Campos em public.propostas
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'modo_apresentacao') THEN
    ALTER TABLE public.propostas ADD COLUMN modo_apresentacao text DEFAULT 'detalhado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'mostrar_endereco') THEN
    ALTER TABLE public.propostas ADD COLUMN mostrar_endereco boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'propostas' AND column_name = 'mostrar_fotos') THEN
    ALTER TABLE public.propostas ADD COLUMN mostrar_fotos boolean DEFAULT true;
  END IF;

  -- Campos em public.proposta_itens
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'endereco_ponto') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN endereco_ponto text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'latitude') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN latitude double precision;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'longitude') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN longitude double precision;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'fotos') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN fotos jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposta_itens' AND column_name = 'produto_id') THEN
    ALTER TABLE public.proposta_itens ADD COLUMN produto_id uuid REFERENCES public.produtos(id) ON DELETE SET NULL;
  END IF;
END $$;
