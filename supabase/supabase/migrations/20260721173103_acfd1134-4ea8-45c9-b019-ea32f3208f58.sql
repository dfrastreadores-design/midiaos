
-- =========================================================
-- LANDING PAGES
-- =========================================================
CREATE TABLE public.landing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  titulo text NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','publicada','arquivada')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  cor_primaria text,
  cor_texto text,
  logo_url text,
  hero_image_url text,
  meta_title text,
  meta_description text,
  meta_og_image text,
  executivo_id uuid,
  views_count integer NOT NULL DEFAULT 0,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_pages_tenant_idx ON public.landing_pages (tenant_id);
CREATE INDEX landing_pages_status_idx ON public.landing_pages (status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_pages TO authenticated;
GRANT SELECT ON public.landing_pages TO anon;
GRANT ALL ON public.landing_pages TO service_role;

ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_pages tenant read"
  ON public.landing_pages FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_pages tenant write"
  ON public.landing_pages FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.current_tenant_id());

CREATE POLICY "landing_pages tenant update"
  ON public.landing_pages FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_pages tenant delete"
  ON public.landing_pages FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "landing_pages public read published"
  ON public.landing_pages FOR SELECT
  TO anon
  USING (status = 'publicada');

CREATE TRIGGER landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER landing_pages_set_tenant
  BEFORE INSERT ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_from_user();

-- =========================================================
-- LANDING PAGE LEADS
-- =========================================================
CREATE TABLE public.landing_page_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  landing_page_id uuid NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  mensagem text,
  campos_extras jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  origem text,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  converted_at timestamptz,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','contato','convertido','descartado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX landing_page_leads_tenant_idx ON public.landing_page_leads (tenant_id);
CREATE INDEX landing_page_leads_page_idx ON public.landing_page_leads (landing_page_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.landing_page_leads TO authenticated;
GRANT INSERT ON public.landing_page_leads TO anon;
GRANT ALL ON public.landing_page_leads TO service_role;

ALTER TABLE public.landing_page_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landing_leads tenant read"
  ON public.landing_page_leads FOR SELECT
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_leads tenant update"
  ON public.landing_page_leads FOR UPDATE
  TO authenticated
  USING (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()))
  WITH CHECK (tenant_id = public.current_tenant_id() OR public.is_super_admin(auth.uid()));

CREATE POLICY "landing_leads tenant delete"
  ON public.landing_page_leads FOR DELETE
  TO authenticated
  USING (
    (tenant_id = public.current_tenant_id() AND (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'diretoria')))
    OR public.is_super_admin(auth.uid())
  );

-- Anônimos podem inserir lead apenas se a landing estiver publicada
CREATE POLICY "landing_leads public insert"
  ON public.landing_page_leads FOR INSERT
  TO anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.landing_pages lp
       WHERE lp.id = landing_page_id
         AND lp.status = 'publicada'
         AND lp.tenant_id = landing_page_leads.tenant_id
    )
  );

CREATE TRIGGER landing_page_leads_updated_at
  BEFORE UPDATE ON public.landing_page_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Contador atômico de views
-- =========================================================
CREATE OR REPLACE FUNCTION public.landing_page_increment_view(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.landing_pages
     SET views_count = views_count + 1
   WHERE slug = _slug AND status = 'publicada';
$$;

GRANT EXECUTE ON FUNCTION public.landing_page_increment_view(text) TO anon, authenticated;
