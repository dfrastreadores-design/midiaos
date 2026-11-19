CREATE TABLE public.proposal_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    proposal_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
    modified_by UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL, -- 'create', 'update', 'status_change', etc.
    changes JSONB, -- store what changed
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Grant permissions
GRANT SELECT ON public.proposal_history TO authenticated;
GRANT ALL ON public.proposal_history TO service_role;

-- Enable RLS
ALTER TABLE public.proposal_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all proposal history" 
ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Owners can view their proposal history" 
ON public.proposal_history FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.propostas 
        WHERE id = proposal_history.proposal_id AND created_by = auth.uid()
    )
);

-- Trigger to automatically log changes on propostas
CREATE OR REPLACE FUNCTION public.log_proposal_changes() 
RETURNS TRIGGER AS $$
DECLARE
    v_changes JSONB := '{}'::jsonb;
    v_action TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        v_action := 'create';
        v_changes := to_jsonb(NEW);
    ELSIF (TG_OP = 'UPDATE') THEN
        v_action := 'update';
        -- Simple diff for important fields
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_changes := v_changes || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
        END IF;
        IF OLD.valor_total IS DISTINCT FROM NEW.valor_total THEN
            v_changes := v_changes || jsonb_build_object('valor_total', jsonb_build_object('old', OLD.valor_total, 'new', NEW.valor_total));
        END IF;
        -- Add more fields as needed or just log the whole new state if changes are complex
    END IF;

    INSERT INTO public.proposal_history (proposal_id, modified_by, action_type, changes)
    VALUES (NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_log_proposal_changes
AFTER INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.log_proposal_changes();
