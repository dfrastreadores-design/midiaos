-- ============================================================================
-- MÍDIA.OS — SISTEMA DE PUSH NOTIFICATIONS (DESKTOP & MOBILE / ANDROID & IOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  device_type text, -- 'desktop', 'android', 'ios', 'outro'
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de performance e consulta rápida
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_tenant_id ON public.push_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_push_subs_ativo ON public.push_subscriptions(ativo);

-- Habilitar RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Usuário gerencia suas próprias inscrições push" ON public.push_subscriptions;
CREATE POLICY "Usuário gerencia suas próprias inscrições push"
  ON public.push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role tem acesso total a push_subscriptions" ON public.push_subscriptions;
CREATE POLICY "Service role tem acesso total a push_subscriptions"
  ON public.push_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.push_subscriptions IS 'Inscrições ativas do Web Push Notification para envio de alertas no Desktop e Mobile (Android/iOS)';
