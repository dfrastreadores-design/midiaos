-- Adicionar o perfil à lista de papéis permitidos (assumindo que existe uma restrição de check ou apenas para documentação se for via código)
-- Como o sistema usa uma tabela user_roles, precisamos garantir que o novo papel possa ser inserido.

-- Adicionar permissões para o novo perfil "parceiro_comercial"
-- Eles só podem acessar o módulo de briefings
INSERT INTO public.role_permissions (role, permission_key)
VALUES 
  ('parceiro_comercial', 'module.briefings')
ON CONFLICT (role, permission_key) DO NOTHING;

-- Garantir que briefings existentes e futuros possam ser acessados por parceiros comerciais (RLS)
-- Geralmente as políticas já cobrem "authenticated", mas se houver políticas específicas por role, elas devem ser revisadas.
-- O arquivo briefings.functions.ts já filtra por userId se não for admin/executivo.
