ALTER TABLE public.briefings 
ADD COLUMN IF NOT EXISTS historico_cliente TEXT,
ADD COLUMN IF NOT EXISTS perfil_audiencia TEXT,
ADD COLUMN IF NOT EXISTS concorrentes TEXT,
ADD COLUMN IF NOT EXISTS tom_comunicacao TEXT,
ADD COLUMN IF NOT EXISTS peças_disponiveis TEXT,
ADD COLUMN IF NOT EXISTS expectativa_resultado TEXT;