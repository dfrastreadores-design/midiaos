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

const AgenciaSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1).max(200),
  nome_fantasia: z.string().max(200).nullable().optional(),
  apelido: z.string().max(200).nullable().optional(),
  cnpj: z.string().max(20).nullable().optional(),
  endereco: z.string().max(300).nullable().optional(),
  cidade: z.string().max(120).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  cep: z.string().max(15).nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
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
  logo_url: z.string().max(500).nullable().optional(),
  status: z.enum(["ativo", "inativa", "bloqueada"]).optional().default("ativo"),
  contatos: z.array(ContatoSchema).default([]),
});

const ImportAgenciasSchema = z.object({
  agencias: z.array(AgenciaSchema).min(1).max(1000),
});

export const listAgencias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agencias")
      .select("*")
      .order("razao_social");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertAgencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AgenciaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, contatos, ...rest } = data;
    const payload = { ...rest, contatos: contatos as unknown as never };
    if (id) {
      const { error } = await supabase
        .from("agencias")
        .update(payload as never)
        .eq("id", id!);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabase
      .from("agencias")
      .insert({ ...payload, created_by: userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const importAgenciasBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ImportAgenciasSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let ok = 0;
    const errors: { razao_social: string; message: string }[] = [];
    const creates = data.agencias.filter((agencia) => !agencia.id);
    const updates = data.agencias.filter((agencia) => agencia.id);

    if (creates.length) {
      const payloads = creates.map(({ id: _id, contatos, ...rest }) => ({
        ...rest,
        contatos: contatos as unknown as never,
        created_by: userId,
      }));
      const { error } = await supabase.from("agencias").insert(payloads as never);
      if (error)
        errors.push(
          ...creates.map((agencia) => ({
            razao_social: agencia.razao_social,
            message: error.message,
          })),
        );
      else ok += creates.length;
    }

    for (const agencia of updates) {
      const { id, contatos, ...rest } = agencia;
      const payload = { ...rest, contatos: contatos as unknown as never };
      const label = agencia.razao_social;
      const { error } = await supabase
        .from("agencias")
        .update(payload as never)
        .eq("id", id!);

      if (error) errors.push({ razao_social: label, message: error.message });
      else ok++;
    }

    return { ok, fail: errors.length, errors };
  });

export const deleteAgencia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agencias").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
