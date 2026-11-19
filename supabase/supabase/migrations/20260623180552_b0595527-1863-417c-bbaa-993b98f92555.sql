
CREATE POLICY "pos-venda-anexos auth read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

CREATE POLICY "pos-venda-anexos auth insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );

CREATE POLICY "pos-venda-anexos auth delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pos-venda-anexos' AND EXISTS (
      SELECT 1 FROM public.pos_vendas pv
      WHERE pv.id::text = split_part(name, '/', 1)
        AND public.can_access_pi(pv.pi_id, auth.uid())
    )
  );
