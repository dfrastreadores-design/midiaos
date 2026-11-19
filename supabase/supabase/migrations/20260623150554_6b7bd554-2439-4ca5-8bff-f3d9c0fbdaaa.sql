DROP POLICY IF EXISTS "Owners can view their proposal history" ON public.proposal_history;
CREATE POLICY "Proposal viewers can view history" ON public.proposal_history
FOR SELECT TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.propostas p
    WHERE p.id = proposal_history.proposal_id
      AND (
        p.created_by = auth.uid()
        OR p.executivo_id = auth.uid()
        OR p.executivo_parceiro_id = auth.uid()
        OR public.has_role(auth.uid(), 'executivo')
        OR public.has_role(auth.uid(), 'diretoria')
        OR public.has_role(auth.uid(), 'financeiro')
      )
  )
);