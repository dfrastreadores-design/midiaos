CREATE INDEX IF NOT EXISTS pi_historico_acao_created_at_idx ON public.pi_historico (acao, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_pi_id_created_at_idx ON public.pi_historico (pi_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pi_historico_created_at_idx ON public.pi_historico (created_at DESC);
CREATE INDEX IF NOT EXISTS pi_share_links_created_at_idx ON public.pi_share_links (created_at DESC);