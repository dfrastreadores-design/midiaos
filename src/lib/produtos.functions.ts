import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MidiaEnum = z.enum(["TV", "Radio", "DOOH"]);

const ProdutoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(160),
  midia: MidiaEnum,
  tipo: z.string().max(60).optional().nullable(),
  programa: z.string().max(120).optional().nullable(),
  formato: z.string().max(120).optional().nullable(),
  faixa: z.string().max(120).optional().nullable(),
  duracao_segundos: z.number().int().min(1).max(7200),
  insercoes_padrao: z.number().int().min(1).max(10000),
  valor_unit: z.number().min(0),
  ativo: z.boolean().default(true),
  observacao: z.string().max(1000).optional().nullable(),
  link_modelo: z.string().trim().url().max(500).optional().nullable().or(z.literal("").transform(() => null)),
  requer_producao: z.boolean().default(false),
  emissora_id: z.string().uuid().optional().nullable(),
  veiculacao_tipo: z.enum(["livre", "dias_uteis", "seg_sab", "dias_fixos", "dias_semana"]).default("livre"),
  dias_fixos: z.array(z.number().int().min(1).max(31)).default([]),
  dias_semana_fixos: z.array(z.number().int().min(0).max(6)).default([]),
  endereco_ponto: z.string().max(300).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  quantidade_telas: z.number().int().min(0).max(100000).optional().nullable(),
  ambientes: z.array(z.string().max(60)).default([]),
  formato_tela: z.string().max(120).optional().nullable(),
  resolucao: z.string().max(60).optional().nullable(),
  tempo_exibicao_segundos: z.number().int().min(0).max(3600).optional().nullable(),
  loop_minutos: z.number().int().min(0).max(1440).optional().nullable(),
  insercoes_por_hora: z.number().int().min(0).max(10000).optional().nullable(),
  horas_operacao_dia: z.number().int().min(0).max(24).optional().nullable(),
  detalhes_venda: z.string().max(2000).optional().nullable(),
});

export const listProdutos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("produtos")
      .select("*")
      .order("midia")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProdutoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const q = data.id
      ? context.supabase.from("produtos").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("produtos").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("produtos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listProdutoTipos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("produto_tipos")
      .select("*")
      .order("midia")
      .order("nome");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProdutoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => 
    z.object({
      id: z.string().uuid().optional(),
      nome: z.string().min(1).max(100),
      midia: z.enum(["TV", "Radio", "DOOH"]),
    }).parse(d)
  )
  .handler(async ({ data, context }) => {
    const payload = { ...data, created_by: context.userId };
    const q = data.id
      ? context.supabase.from("produto_tipos").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("produto_tipos").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteProdutoTipo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("produto_tipos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ProdutoImportSchema = ProdutoSchema.partial({
  duracao_segundos: true,
  insercoes_padrao: true,
  valor_unit: true,
  ativo: true,
});

export const importProdutosBulk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ produtos: z.array(ProdutoImportSchema).min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const payloads = data.produtos.map(({ id: _id, ...rest }) => ({
      duracao_segundos: 30,
      insercoes_padrao: 1,
      valor_unit: 0,
      ativo: true,
      ...rest,
      created_by: userId,
    }));
    const errors: { nome: string; message: string }[] = [];
    let ok = 0;
    // Insere em lotes para evitar payloads grandes
    for (let i = 0; i < payloads.length; i += 100) {
      const chunk = payloads.slice(i, i + 100);
      const { error } = await supabase.from("produtos").insert(chunk as never);
      if (error) {
        // fallback linha a linha para identificar quais falharam
        for (const row of chunk) {
          const { error: e2 } = await supabase.from("produtos").insert(row as never);
          if (e2) errors.push({ nome: row.nome, message: e2.message });
          else ok++;
        }
      } else ok += chunk.length;
    }
    return { ok, fail: errors.length, errors };
  });
