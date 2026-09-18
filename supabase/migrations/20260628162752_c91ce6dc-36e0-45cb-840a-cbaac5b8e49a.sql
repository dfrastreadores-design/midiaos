
-- Índices para acelerar relatórios filtrando por período, executivo, cliente, agência e datas fiscais
CREATE INDEX IF NOT EXISTS pis_tenant_created_at_idx ON public.pis (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_executivo_created_at_idx ON public.pis (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_cliente_created_at_idx ON public.pis (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_agencia_created_at_idx ON public.pis (agencia_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pis_status_idx ON public.pis (status);
CREATE INDEX IF NOT EXISTS pis_ano_mes_veiculacao_idx ON public.pis (ano_veiculacao, mes_veiculacao);
CREATE INDEX IF NOT EXISTS pis_periodo_idx ON public.pis (periodo_inicio, periodo_fim);
CREATE INDEX IF NOT EXISTS pis_data_faturamento_idx ON public.pis (data_faturamento) WHERE data_faturamento IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_envio_nota_idx ON public.pis (data_envio_nota) WHERE data_envio_nota IS NOT NULL;
CREATE INDEX IF NOT EXISTS pis_data_vencimento_nota_idx ON public.pis (data_vencimento_nota) WHERE data_vencimento_nota IS NOT NULL;

CREATE INDEX IF NOT EXISTS propostas_executivo_created_at_idx ON public.propostas (executivo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_cliente_created_at_idx ON public.propostas (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS propostas_status_idx ON public.propostas (status);

CREATE INDEX IF NOT EXISTS metas_executivo_ano_idx ON public.metas_executivo (ano, executivo_id);
