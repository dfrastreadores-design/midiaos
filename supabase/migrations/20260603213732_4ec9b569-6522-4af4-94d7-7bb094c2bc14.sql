-- Concede permissões para o novo papel 'diretoria'
INSERT INTO public.role_permissions (role, permission_key)
VALUES 
  ('diretoria', 'module.crm'),
  ('diretoria', 'module.clientes'),
  ('diretoria', 'module.agencias'),
  ('diretoria', 'module.produtos'),
  ('diretoria', 'module.pi'),
  ('diretoria', 'module.propostas'),
  ('diretoria', 'module.projetos'),
  ('diretoria', 'module.financeiro'),
  ('diretoria', 'module.calendario'),
  ('diretoria', 'module.relatorios'),
  ('diretoria', 'module.metas'),
  ('diretoria', 'pi.view_all'),
  ('diretoria', 'pi.approve'),
  ('diretoria', 'financeiro.view')
ON CONFLICT (role, permission_key) DO NOTHING;
