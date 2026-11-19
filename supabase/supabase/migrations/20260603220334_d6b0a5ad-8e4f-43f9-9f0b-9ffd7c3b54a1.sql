-- 1. Adiciona as colunas permitindo nulos inicialmente
ALTER TABLE public.pi_itens ADD COLUMN mes INTEGER;
ALTER TABLE public.pi_itens ADD COLUMN ano INTEGER;

-- 2. Migra os dados existentes da tabela pis para pi_itens
UPDATE public.pi_itens
SET mes = pis.mes_veiculacao,
    ano = pis.ano_veiculacao
FROM public.pis
WHERE pi_itens.pi_id = pis.id;

-- 3. Agora podemos colocar restrição de NOT NULL se desejado, 
-- mas vamos deixar opcional por enquanto para manter compatibilidade durante o deploy.
-- GRANTs já devem existir na tabela, mas garantimos para as novas colunas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pi_itens TO authenticated;
GRANT ALL ON public.pi_itens TO service_role;
