-- Migration: Social Media & Gestor de Tráfego Hub
-- Contas conectadas, posts agendados, IA de conteúdo e métricas de alcance/tráfego

create table if not exists public.social_contas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  plataforma text not null, -- 'instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'meta_ads', 'google_ads'
  nome_conta text not null,
  username text,
  avatar_url text,
  seguidores int default 0,
  taxa_engajamento numeric(5,2) default 0.0,
  status text default 'conectado', -- 'conectado', 'expirando', 'desconectado'
  access_token text,
  meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  conta_ids uuid[] default array[]::uuid[],
  plataformas text[] default array[]::text[],
  formato text default 'feed', -- 'feed', 'story', 'reels', 'carrossel', 'anuncio', 'artigo'
  titulo text,
  conteudo text not null,
  hashtags text,
  midia_urls text[] default array[]::text[],
  status text default 'agendado', -- 'rascunho', 'agendado', 'publicado', 'falhou'
  data_agendamento timestamptz,
  data_publicacao timestamptz,
  tipo_anuncio boolean default false,
  meta_ads_data jsonb default '{}'::jsonb, -- { cta, url_destino, publico, objetivo_campanha, budget_diario }
  metricas jsonb default '{}'::jsonb, -- { alcance, impressoes, curtidas, comentarios, compartilhamentos, cliques, cpc, roas }
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.social_metricas_analytics (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  conta_id uuid references public.social_contas(id) on delete set null,
  data date not null default current_date,
  plataforma text not null,
  alcance int default 0,
  impressoes int default 0,
  engajamento int default 0,
  cliques_link int default 0,
  seguidores_novos int default 0,
  gasto_trafego numeric(10,2) default 0.0,
  conversoes int default 0,
  roas numeric(5,2) default 0.0,
  cpc numeric(6,2) default 0.0,
  cpm numeric(6,2) default 0.0,
  created_at timestamptz default now()
);

-- Índices de consulta rápida
create index if not exists idx_social_contas_tenant on public.social_contas(tenant_id);
create index if not exists idx_social_posts_tenant on public.social_posts(tenant_id);
create index if not exists idx_social_posts_data on public.social_posts(data_agendamento);
create index if not exists idx_social_metricas_tenant_data on public.social_metricas_analytics(tenant_id, data);

-- RLS
alter table public.social_contas enable row level security;
alter table public.social_posts enable row level security;
alter table public.social_metricas_analytics enable row level security;

create policy "social_contas_all" on public.social_contas
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );

create policy "social_posts_all" on public.social_posts
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );

create policy "social_metricas_all" on public.social_metricas_analytics
  for all using (
    auth.uid() is not null and (
      tenant_id is null or 
      tenant_id = (select tenant_id from public.profiles where id = auth.uid())
    )
  );
