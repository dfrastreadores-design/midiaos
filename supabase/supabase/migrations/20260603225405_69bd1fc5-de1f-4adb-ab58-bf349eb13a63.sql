-- Adicionar chaves estrangeiras se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_cliente_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_cliente_id_fkey 
        FOREIGN KEY (cliente_id) REFERENCES public.clientes(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_agencia_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_agencia_id_fkey 
        FOREIGN KEY (agencia_id) REFERENCES public.agencias(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'propostas_executivo_id_fkey') THEN
        ALTER TABLE public.propostas 
        ADD CONSTRAINT propostas_executivo_id_fkey 
        FOREIGN KEY (executivo_id) REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposta_itens_proposta_id_fkey') THEN
        ALTER TABLE public.proposta_itens 
        ADD CONSTRAINT proposta_itens_proposta_id_fkey 
        FOREIGN KEY (proposta_id) REFERENCES public.propostas(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Garantir permissões (caso necessário após alteração de estrutura)
GRANT SELECT ON public.propostas TO authenticated;
GRANT SELECT ON public.clientes TO authenticated;
GRANT SELECT ON public.agencias TO authenticated;
GRANT SELECT ON public.proposta_itens TO authenticated;
