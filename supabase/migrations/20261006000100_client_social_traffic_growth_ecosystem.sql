-- ==============================================================================
-- MIGRATION: 20261006000100_client_social_traffic_growth_ecosystem.sql
-- DESCRIÇÃO: Ecossistema Integrado de Gestão de Redes Sociais, Tráfego Pago,
--           Agendamento de Publicações & Insights Estratégicos com IA
--           vinculado a cada cliente anunciante.
-- POLÍTICA: Zero Perda de Dados (AGENTS.md) - Não-destrutiva com IF NOT EXISTS
-- ==============================================================================

-- 1. TABELA client_social_accounts (Contas Conectadas do Cliente)
CREATE TABLE IF NOT EXISTS public.client_social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook', 'meta_ads', 'google_ads', 'tiktok', 'linkedin', 'youtube', 'twitter')),
  account_name TEXT NOT NULL,
  account_id TEXT,
  profile_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'disconnected', 'expired')),
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas caso a tabela já exista
ALTER TABLE public.client_social_accounts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS account_name TEXT,
  ADD COLUMN IF NOT EXISTS account_id TEXT,
  ADD COLUMN IF NOT EXISTS profile_url TEXT,
  ADD COLUMN IF NOT EXISTS access_token TEXT,
  ADD COLUMN IF NOT EXISTS refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS connection_status TEXT DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT now();

-- 2. TABELA social_traffic_metrics (Métricas de Tráfego e Redes Sociais)
CREATE TABLE IF NOT EXISTS public.social_traffic_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  platform TEXT NOT NULL,
  impressions NUMERIC NOT NULL DEFAULT 0,
  reach NUMERIC NOT NULL DEFAULT 0,
  clicks NUMERIC NOT NULL DEFAULT 0,
  ctr NUMERIC(6,3) NOT NULL DEFAULT 0,
  spend NUMERIC(12,2) NOT NULL DEFAULT 0,
  conversions NUMERIC NOT NULL DEFAULT 0,
  cpa NUMERIC(10,2) NOT NULL DEFAULT 0,
  roas NUMERIC(6,2) NOT NULL DEFAULT 0,
  followers_total NUMERIC NOT NULL DEFAULT 0,
  followers_growth NUMERIC NOT NULL DEFAULT 0,
  engagement_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  raw_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.social_traffic_metrics
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS metric_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS platform TEXT,
  ADD COLUMN IF NOT EXISTS impressions NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reach NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicks NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctr NUMERIC(6,3) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spend NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cpa NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS roas NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_total NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_growth NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS raw_data JSONB DEFAULT '{}'::jsonb;

-- 3. TABELA social_scheduled_posts (Agendamento de Publicações & Calendário de Conteúdo)
CREATE TABLE IF NOT EXISTS public.social_scheduled_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  platforms TEXT[] NOT NULL DEFAULT ARRAY['instagram']::TEXT[],
  post_type TEXT NOT NULL DEFAULT 'feed_image' CHECK (post_type IN ('feed_image', 'carousel', 'reels', 'story', 'text_only')),
  caption TEXT NOT NULL,
  media_urls TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_message TEXT,
  published_post_id TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.social_scheduled_posts
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS platforms TEXT[] DEFAULT ARRAY['instagram']::TEXT[],
  ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'feed_image',
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled',
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS published_post_id TEXT;

-- 4. TABELA ai_growth_insights (Recomendações e Dicas de Crescimento com IA)
CREATE TABLE IF NOT EXISTS public.ai_growth_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('budget_optimization', 'creative_performance', 'audience_targeting', 'posting_schedule', 'churn_alert')),
  title TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  expected_impact TEXT NOT NULL DEFAULT 'medio' CHECK (expected_impact IN ('alto', 'medio', 'baixo')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas aditivas
ALTER TABLE public.ai_growth_insights
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.client_social_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS expected_impact TEXT DEFAULT 'medio',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_csa_tenant_client ON public.client_social_accounts(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_csa_platform ON public.client_social_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_stm_account_date ON public.social_traffic_metrics(account_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_stm_tenant_date ON public.social_traffic_metrics(tenant_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_ssp_tenant_client ON public.social_scheduled_posts(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_ssp_scheduled_status ON public.social_scheduled_posts(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_agi_client_status ON public.ai_growth_insights(client_id, status);

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.client_social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_growth_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de isolamento por tenant
DROP POLICY IF EXISTS "tenant_isolation_csa" ON public.client_social_accounts;
CREATE POLICY "tenant_isolation_csa" ON public.client_social_accounts
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_stm" ON public.social_traffic_metrics;
CREATE POLICY "tenant_isolation_stm" ON public.social_traffic_metrics
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_ssp" ON public.social_scheduled_posts;
CREATE POLICY "tenant_isolation_ssp" ON public.social_scheduled_posts
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );

DROP POLICY IF EXISTS "tenant_isolation_agi" ON public.ai_growth_insights;
CREATE POLICY "tenant_isolation_agi" ON public.ai_growth_insights
  FOR ALL USING (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  ) WITH CHECK (
    tenant_id = public.current_user_tenant_id() OR public.is_master_admin()
  );
