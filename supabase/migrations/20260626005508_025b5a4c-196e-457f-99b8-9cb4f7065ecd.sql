
ALTER TABLE public.propostas DROP CONSTRAINT propostas_cliente_id_fkey;
ALTER TABLE public.propostas ADD CONSTRAINT propostas_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;

ALTER TABLE public.permuta_recebimentos DROP CONSTRAINT permuta_recebimentos_cliente_id_fkey;
ALTER TABLE public.permuta_recebimentos ADD CONSTRAINT permuta_recebimentos_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE SET NULL;
