
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Users can delete their own briefings' AND polrelid = 'public.briefings'::regclass) THEN
    CREATE POLICY "Users can delete their own briefings" ON public.briefings FOR DELETE USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;
