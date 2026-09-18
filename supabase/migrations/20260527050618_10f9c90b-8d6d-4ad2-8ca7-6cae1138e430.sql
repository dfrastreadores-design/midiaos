
-- Insere permissões de módulo
INSERT INTO public.permissions (key, label, description) VALUES
  ('module.crm', 'Módulo: Funil CRM', 'Acesso ao Funil CRM'),
  ('module.clientes', 'Módulo: Clientes', 'Acesso ao módulo Clientes'),
  ('module.agencias', 'Módulo: Agências', 'Acesso ao módulo Agências'),
  ('module.produtos', 'Módulo: Produtos', 'Acesso ao módulo Produtos (TV/Rádio/DOOH)'),
  ('module.pi', 'Módulo: Pedidos de Inserção', 'Acesso ao módulo PI'),
  ('module.propostas', 'Módulo: Propostas', 'Acesso ao módulo Propostas'),
  ('module.projetos', 'Módulo: Projetos Especiais', 'Acesso ao módulo Projetos Especiais'),
  ('module.financeiro', 'Módulo: Financeiro', 'Acesso ao módulo Financeiro'),
  ('module.calendario', 'Módulo: Calendário', 'Acesso ao módulo Calendário'),
  ('module.relatorios', 'Módulo: Relatórios', 'Acesso ao módulo Relatórios'),
  ('module.metas', 'Módulo: Metas', 'Acesso ao módulo Metas')
ON CONFLICT (key) DO NOTHING;

-- Seed defaults baseados no MODULE_ACCESS atual (admin é tratado via is_admin, não precisa popular)
INSERT INTO public.role_permissions (role, permission_key) VALUES
  ('executivo', 'module.crm'),
  ('executivo', 'module.clientes'),
  ('executivo', 'module.agencias'),
  ('executivo', 'module.produtos'),
  ('executivo', 'module.pi'),
  ('executivo', 'module.propostas'),
  ('executivo', 'module.projetos'),
  ('executivo', 'module.calendario'),
  ('executivo', 'module.relatorios'),
  ('opec', 'module.produtos'),
  ('opec', 'module.pi'),
  ('opec', 'module.calendario'),
  ('financeiro', 'module.financeiro'),
  ('financeiro', 'module.relatorios')
ON CONFLICT DO NOTHING;
