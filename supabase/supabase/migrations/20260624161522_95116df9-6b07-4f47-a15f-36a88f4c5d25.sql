
CREATE TABLE public.pi_share_links (
  token text PRIMARY KEY,
  pi_id uuid NOT NULL REFERENCES public.pis(id) ON DELETE CASCADE,
  signed_url text NOT NULL,
  storage_path text,
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_access_at timestamptz,
  access_count integer NOT NULL DEFAULT 0
);

GRANT SELECT, INSERT, UPDATE ON public.pi_share_links TO authenticated;
GRANT ALL ON public.pi_share_links TO service_role;

ALTER TABLE public.pi_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pi share links read by owner or admin" ON public.pi_share_links
  FOR SELECT TO authenticated
  USING (public.can_access_pi(pi_id, auth.uid()));

CREATE POLICY "pi share links insert by owner or admin" ON public.pi_share_links
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_pi(pi_id, auth.uid()));

CREATE INDEX pi_share_links_pi_id_idx ON public.pi_share_links(pi_id);
