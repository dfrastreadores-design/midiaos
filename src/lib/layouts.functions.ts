import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listProposalLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("proposta_layouts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const upsertProposalLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => 
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1),
      config: z.any(),
      is_default: z.boolean().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;

    if (id) {
      const { error } = await supabase
        .from("proposta_layouts")
        .update(rest as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }

    const { data: created, error } = await supabase
      .from("proposta_layouts")
      .insert({ ...rest, created_by: userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteProposalLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("proposta_layouts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
