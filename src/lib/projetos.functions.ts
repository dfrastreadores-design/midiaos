import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ProjetoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(200),
  descricao: z.string().max(3000).nullable().optional(),
  cliente_alvo: z.string().max(200).nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  agencia_id: z.string().uuid().nullable().optional(),
  responsavel_id: z.string().uuid().nullable().optional(),
  comercializacao_inicio: z.string().nullable().optional(),
  comercializacao_fim: z.string().min(1),
  valor_estimado: z.number().nullable().optional(),
  materiais: z.string().max(3000).nullable().optional(),
  observacao: z.string().max(3000).nullable().optional(),
  arquivo_url: z.string().max(1000).nullable().optional(),
  arquivo_nome: z.string().max(300).nullable().optional(),
  status: z.enum(["em_comercializacao", "vendido", "encerrado", "cancelado"]),
});

export const listProjetos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projetos_especiais")
      .select("*")
      .order("comercializacao_fim", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProjetoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { id, ...rest } = data;
    if (id) {
      const { error } = await supabase
        .from("projetos_especiais")
        .update(rest as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: created, error } = await supabase
      .from("projetos_especiais")
      .insert({ ...rest, created_by: userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projetos_especiais").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const SugerirSchema = z.object({
  texto: z.string().min(10).max(50000),
});

type SugestaoCliente = {
  cliente_id: string;
  nome: string;
  motivo: string;
  score: number;
};

export const sugerirClientesProjeto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SugerirSchema.parse(d))
  .handler(async ({ data, context }): Promise<{ sugestoes: SugestaoCliente[] }> => {
    const { supabase } = context;
    const { data: clientes, error } = await supabase
      .from("clientes")
      .select("id, razao_social, nome_fantasia, observacao, cidade, uf");
    if (error) throw new Error(error.message);
    const lista = (clientes ?? []).map((c) => ({
      id: c.id,
      nome: c.nome_fantasia || c.razao_social,
      perfil: [c.observacao, c.cidade, c.uf].filter(Boolean).join(" | "),
    }));

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada");

    const prompt = `Você é um especialista comercial de uma emissora de TV. Receberá o texto/descritivo de um PROJETO ESPECIAL e uma lista de CLIENTES cadastrados. Analise o segmento, público-alvo e proposta do projeto, e indique de 3 a 8 clientes da lista que tenham maior aderência para comercialização. Considere segmento, perfil descrito em "perfil" e localização.

PROJETO:
"""${data.texto.slice(0, 12000)}"""

CLIENTES (use SOMENTE estes ids):
${JSON.stringify(lista).slice(0, 20000)}

Responda APENAS um JSON no formato:
{"sugestoes":[{"cliente_id":"uuid","nome":"...","motivo":"breve justificativa","score":0-100}]}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você responde apenas com JSON válido, sem markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429)
        throw new Error("Limite de uso de IA atingido. Tente novamente em instantes.");
      if (res.status === 402)
        throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(`Falha na IA (${res.status})`);
    }
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json|```/g, "").trim();
    let parsed: { sugestoes?: SugestaoCliente[] } = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }
    const validIds = new Set(lista.map((c) => c.id));
    const sugestoes = (parsed.sugestoes ?? [])
      .filter((s) => validIds.has(s.cliente_id))
      .slice(0, 10);
    return { sugestoes };
  });
