import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ContatoSchema = z.object({
  nome: z.string().max(120),
  cargo: z.string().max(120).optional().default(""),
  funcao: z.string().max(120).optional().default(""),
  email: z.string().max(200).optional().default(""),
  telefone: z.string().max(40).optional().default(""),
  aniversario: z
    .string()
    .max(5)
    .regex(/^(\d{2}\/\d{2})?$/)
    .optional()
    .default(""),
});

const ClienteSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1).max(200),
  nome_fantasia: z.string().max(200).nullable().optional(),
  apelido: z.string().max(200).nullable().optional(),
  cnpj: z.string().max(20).nullable().optional(),
  endereco: z.string().max(300).nullable().optional(),
  cidade: z.string().max(120).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  cep: z.string().max(15).nullable().optional(),
  agencia_id: z.string().uuid().nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
  segmento: z.string().max(120).nullable().optional(),
  inscricao_estadual: z.string().max(40).nullable().optional(),
  inscricao_municipal: z.string().max(40).nullable().optional(),
  cnae: z.string().max(300).nullable().optional(),
  situacao_cadastral: z.string().max(60).nullable().optional(),
  website: z.string().max(255).nullable().optional(),
  instagram: z.string().max(255).nullable().optional(),
  linkedin: z.string().max(255).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  data_aniversario: z
    .string()
    .regex(/^\d{2}\/\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["ativo", "inativo", "prospect", "bloqueado"]).optional().default("ativo"),
  contatos: z.array(ContatoSchema).default([]),
});

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clientes")
      .select("*, agencia:agencias(id,razao_social,nome_fantasia)")
      .order("razao_social");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClienteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, contatos, ...rest } = data;
    const payload = { ...rest, contatos: contatos as unknown as never };
    if (id) {
      const { error } = await supabase
        .from("clientes")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabase
      .from("clientes")
      .insert({ ...payload, created_by: userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clientes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
