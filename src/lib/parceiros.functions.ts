import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { traduzirErro } from "./error-translator";

export const SEGMENTOS_MIDIA = [
  "DOOH",
  "Front Lights",
  "Telas em Transporte por Aplicativo",
  "Painéis Digitais de Rua",
  "Telas em Elevadores Residenciais",
  "Painéis em Pontos de Ônibus",
  "Adesivagem de Bancas de Jornal",
  "Telas em Restaurantes e Barbearias",
  "Painéis em Shoppings",
  "Espaços Comerciais em Shoppings e Hotéis",
  "Telas em Elevadores Corporativos",
  "Painéis em Rodovias / Outdoor",
  "Painéis em Aeroportos",
  "Telas em Academias e Gastronomia",
] as const;

export const MODELOS_REMUNERACAO = [
  {
    value: "comissao_percentual",
    label: "Comissão % sobre vendas (Remuneração do Inquilino)",
    desc: "Inquilino recebe % sobre o valor bruto ou líquido vendido",
  },
  {
    value: "margem_sobre_custo",
    label: "Margem sobre tabela/custo do parceiro",
    desc: "Parceiro define custo base e o inquilino negocia com margem própria",
  },
  {
    value: "repasse_liquido",
    label: "Faturamento direto com repasse ao parceiro",
    desc: "Inquilino emite o PI/fatura e repassa o valor líquido deduzida a sua remuneração",
  },
  {
    value: "faturamento_parceiro",
    label: "Faturamento direto pelo parceiro com RT",
    desc: "Parceiro fatura direto ao cliente e paga comissão/RT ao inquilino",
  },
] as const;

export const ParceiroSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1, "Razão Social é obrigatória").max(200),
  nome_fantasia: z.string().max(200).optional().nullable(),
  cnpj: z.string().max(30).optional().nullable(),
  site: z.string().max(300).optional().nullable().or(z.literal("").transform(() => null)),
  instagram: z.string().max(150).optional().nullable().or(z.literal("").transform(() => null)),
  linkedin: z.string().max(300).optional().nullable().or(z.literal("").transform(() => null)),
  facebook: z.string().max(300).optional().nullable().or(z.literal("").transform(() => null)),
  redes_sociais: z.record(z.any()).optional().nullable(),
  segmentos: z.array(z.string().max(100)).default([]),
  modelo_remuneracao: z.string().default("comissao_percentual"),
  comissao_padrao_pct: z.number().min(0).max(100).default(20.0),
  prazo_repasse: z.string().max(200).optional().nullable(),
  condicoes_comerciais: z.string().max(2000).optional().nullable(),
  contato_nome: z.string().max(150).optional().nullable(),
  contato_email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  contato_telefone: z.string().max(40).optional().nullable(),
  chave_pix: z.string().max(100).optional().nullable(),
  dados_bancarios: z.string().max(500).optional().nullable(),
  endereco: z.string().max(300).optional().nullable(),
  cidade: z.string().max(100).optional().nullable(),
  uf: z.string().max(10).optional().nullable(),
  cep: z.string().max(20).optional().nullable(),
  observacoes: z.string().max(2000).optional().nullable(),
  ativo: z.boolean().default(true),
});

export type Parceiro = z.infer<typeof ParceiroSchema> & {
  produtos_count?: number;
  produtos_valor_total?: number;
  created_at?: string;
  updated_at?: string;
};

export const listParceiros = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // Busca parceiros
    let query = supabase.from("parceiros").select("*");
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    const { data: parceiros, error: pErr } = await query.order("razao_social");

    // Se tabela ainda não foi criada, retorna lista vazia sem quebrar
    if (pErr) {
      console.warn("Aviso ao listar parceiros:", pErr.message);
      return [];
    }

    // Busca produtos para associar contagens e totais
    let pQuery = supabase
      .from("produtos")
      .select("id, parceiro_id, parceiro_cnpj, parceiro_nome, valor_unit, ativo");
    if (tenantId) pQuery = pQuery.eq("tenant_id", tenantId);
    const { data: produtos = [] } = await pQuery;

    return (parceiros ?? []).map((parceiro: any) => {
      const prods = (produtos ?? []).filter(
        (p: any) =>
          (p.parceiro_id && p.parceiro_id === parceiro.id) ||
          (p.parceiro_cnpj &&
            parceiro.cnpj &&
            p.parceiro_cnpj.replace(/\D/g, "") === parceiro.cnpj.replace(/\D/g, "")) ||
          (p.parceiro_nome &&
            parceiro.razao_social &&
            p.parceiro_nome.toLowerCase().trim() === parceiro.razao_social.toLowerCase().trim()),
      );

      const valorTotal = prods.reduce(
        (acc: number, cur: any) => acc + (Number(cur.valor_unit) || 0),
        0,
      );

      return {
        ...parceiro,
        produtos_count: prods.length,
        produtos_valor_total: valorTotal,
      };
    });
  });

export const getParceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: parceiro, error } = await supabase
      .from("parceiros")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    // Busca produtos do parceiro
    const { data: produtos = [] } = await supabase
      .from("produtos")
      .select("*")
      .or(`parceiro_id.eq.${data.id},parceiro_cnpj.eq.${parceiro.cnpj}`);

    return {
      ...parceiro,
      produtos: produtos ?? [],
    };
  });

export const upsertParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ParceiroSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    const payload: any = {
      ...data,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    let q = data.id
      ? supabase.from("parceiros").update(payload).eq("id", data.id).select().single()
      : supabase.from("parceiros").insert(payload).select().single();

    const res = await q;
    if (res.error) throw new Error(traduzirErro(res.error.message));

    // Se o parceiro tiver CNPJ ou Razão Social atualizada, atualiza vínculos de produtos
    if (res.data?.id && (res.data.cnpj || res.data.razao_social)) {
      try {
        const updateProdPayload: any = {
          parceiro_id: res.data.id,
          parceiro_nome: res.data.nome_fantasia || res.data.razao_social,
        };
        if (res.data.cnpj) updateProdPayload.parceiro_cnpj = res.data.cnpj;

        if (res.data.cnpj) {
          await supabase
            .from("produtos")
            .update(updateProdPayload)
            .eq("parceiro_cnpj", res.data.cnpj);
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar produtos vinculados:", err);
      }
    }

    return res.data;
  });

export const deleteParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Desvincula produtos deste parceiro antes de remover
    try {
      await supabase.from("produtos").update({ parceiro_id: null }).eq("parceiro_id", data.id);
    } catch {
      // ignora
    }

    const { error } = await supabase.from("parceiros").delete().eq("id", data.id);
    if (error) throw new Error(traduzirErro(error.message));
    return { ok: true };
  });
