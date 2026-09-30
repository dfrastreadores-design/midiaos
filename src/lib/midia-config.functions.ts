import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MidiaEnum = z.string().min(1).max(60);

const ConfigSchema = z.object({
  midia: MidiaEnum,
  cnpj: z.string().max(20).optional().nullable(),
  razao_social: z.string().max(200).optional().nullable(),
  nome_fantasia: z.string().max(200).optional().nullable(),
  endereco: z.string().max(300).optional().nullable(),
  cidade: z.string().max(120).optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  cep: z.string().max(12).optional().nullable(),
  inscricao_estadual: z.string().max(40).optional().nullable(),
  inscricao_municipal: z.string().max(40).optional().nullable(),
  telefone: z.string().max(40).optional().nullable(),
  email: z.string().max(200).optional().nullable(),
  site: z.string().max(200).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  observacao: z.string().max(1000).optional().nullable(),
});

export const listMidiaConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("midia_config").select("*").order("midia");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertMidiaConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ConfigSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, updated_by: context.userId, updated_at: new Date().toISOString() };
    const { data: row, error } = await context.supabase
      .from("midia_config")
      .upsert(payload, { onConflict: "midia" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
