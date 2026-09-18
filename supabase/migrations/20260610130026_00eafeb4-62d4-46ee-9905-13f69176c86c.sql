ALTER TABLE public.briefings 
DROP CONSTRAINT IF EXISTS briefings_created_by_fkey;

ALTER TABLE public.briefings
ADD CONSTRAINT briefings_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- Ensure permissions are correct
GRANT SELECT, INSERT, UPDATE, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
