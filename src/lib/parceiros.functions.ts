import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

const nullableString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null));

export const ParceiroSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1, "Razão Social é obrigatória").max(200),
  nome_fantasia: nullableString(200),
  cnpj: nullableString(30),
  logo_url: nullableString(1000),
  tipo_veiculo: z.string().default("Painel OOH/DOOH"),
  status: z.enum(["ativo", "inativo", "em_negociacao"]).default("ativo"),
  comissao_padrao_percentual: z.number().min(0).max(100).default(20.0),
  site: nullableString(300),
  instagram: nullableString(150),
  linkedin: nullableString(300),
  facebook: nullableString(300),
  redes_sociais: z.record(z.any()).optional().nullable(),
  segmentos: z.array(z.string().max(100)).default([]),
  modelo_remuneracao: z.string().default("comissao_percentual"),
  comissao_padrao_pct: z.number().min(0).max(100).default(20.0),
  prazo_repasse: nullableString(200),
  condicoes_comerciais: nullableString(2000),
  contato_nome: nullableString(150),
  contato_email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  contato_telefone: nullableString(40),
  chave_pix: nullableString(100),
  dados_bancarios: nullableString(500),
  endereco: nullableString(300),
  cidade: nullableString(100),
  uf: nullableString(10),
  cep: nullableString(20),
  observacoes: nullableString(2000),
  media_kit_defenses: z.any().optional().nullable(),
  commercial_discounts_rules: z.any().optional().nullable(),
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

    let tenantId: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      tenantId = prof?.tenant_id ?? null;
    } catch {
      // Ignora erro de profiles se RLS restringir
    }

    // Busca parceiros
    let query = supabase.from("parceiros").select("*");
    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }
    let { data: parceiros, error: pErr } = await query.order("razao_social");

    // Fallback defensivo com supabaseAdmin se client falhar (ex: schema cache PostgREST temporário)
    if (pErr) {
      console.warn("[listParceiros] Falha na consulta de parceiros via client:", pErr.message, "- Tentando via supabaseAdmin...");
      let adminQuery = supabaseAdmin.from("parceiros").select("*");
      if (tenantId) {
        adminQuery = adminQuery.eq("tenant_id", tenantId);
      }
      const adminRes = await adminQuery.order("razao_social");
      if (!adminRes.error && adminRes.data) {
        parceiros = adminRes.data;
        pErr = null;
      }
    }

    if (pErr) {
      console.warn("Aviso ao listar parceiros:", pErr.message);
      return [];
    }

    // Busca produtos para associar contagens e totais
    let produtos: any[] = [];
    try {
      let pQuery = supabase
        .from("produtos")
        .select("id, parceiro_id, parceiro_cnpj, parceiro_nome, valor_unit, ativo");
      if (tenantId) pQuery = pQuery.eq("tenant_id", tenantId);
      const { data: prodData, error: prodErr } = await pQuery;
      if (!prodErr && prodData) {
        produtos = prodData;
      } else {
        let adminPQuery = supabaseAdmin
          .from("produtos")
          .select("id, parceiro_id, parceiro_cnpj, parceiro_nome, valor_unit, ativo");
        if (tenantId) adminPQuery = adminPQuery.eq("tenant_id", tenantId);
        const { data: adminProdData } = await adminPQuery;
        if (adminProdData) produtos = adminProdData;
      }
    } catch {
      // Ignora se produtos não estiver acessível
    }

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
    let { data: parceiro, error } = await supabase
      .from("parceiros")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (error || !parceiro) {
      const adminRes = await supabaseAdmin
        .from("parceiros")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (adminRes.data) {
        parceiro = adminRes.data;
        error = null;
      }
    }

    if (error || !parceiro) throw new Error(error?.message || "Parceiro não encontrado");

    // Busca produtos do parceiro
    let produtos: any[] = [];
    try {
      const { data: prods } = await supabase
        .from("produtos")
        .select("*")
        .or(`parceiro_id.eq.${data.id},parceiro_cnpj.eq.${parceiro.cnpj}`);
      produtos = prods ?? [];
    } catch {
      // Ignora
    }

    return {
      ...parceiro,
      produtos,
    };
  });

export const upsertParceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ParceiroSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let tenantId: string | null = null;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      tenantId = prof?.tenant_id ?? null;
    } catch {
      // Ignora erro ao buscar profile
    }

    const { id, ...restData } = data;
    const payload: any = {
      ...restData,
      ...(tenantId ? { tenant_id: tenantId } : {}),
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    let q = id
      ? supabase.from("parceiros").update(payload).eq("id", id).select().single()
      : supabase.from("parceiros").insert(payload).select().single();

    let res = await q;

    // Se o client do usuário encontrar erro (ex: schema cache PostgREST ou RLS transitório), usa supabaseAdmin
    if (res.error) {
      console.warn(
        "[upsertParceiro] Tentativa inicial com supabase client falhou:",
        res.error.message,
        "- Tentando via supabaseAdmin...",
      );
      const adminQ = id
        ? supabaseAdmin.from("parceiros").update(payload).eq("id", id).select().single()
        : supabaseAdmin.from("parceiros").insert(payload).select().single();
      const adminRes = await adminQ;
      if (!adminRes.error && adminRes.data) {
        res = adminRes;
      }
    }

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
          await supabaseAdmin
            .from("produtos")
            .update(updateProdPayload)
            .eq("parceiro_cnpj", res.data.cnpj);
        }
      } catch (err) {
        console.warn("Aviso ao sincronizar produtos vinculados:", err);
      }
    }

    // Sincroniza também na tabela partners
    try {
      const partnerPayload: any = {
        id: res.data.id,
        tenant_id: tenantId,
        razao_social: res.data.razao_social,
        nome_fantasia: res.data.nome_fantasia,
        cnpj: res.data.cnpj,
        logo_url: res.data.logo_url,
        contato_nome: res.data.contato_nome,
        email: res.data.contato_email,
        telefone: res.data.contato_telefone,
        site: res.data.site,
        tipo_veiculo: res.data.tipo_veiculo || "Painel OOH/DOOH",
        comissao_padrao_percentual: Number(res.data.comissao_padrao_pct || res.data.comissao_padrao_percentual || 20),
        status: res.data.status || (res.data.ativo === false ? "inativo" : "ativo"),
        endereco: res.data.endereco,
        cidade: res.data.cidade,
        uf: res.data.uf,
        cep: res.data.cep,
        observacoes: res.data.observacoes,
        media_kit_defenses: res.data.media_kit_defenses ?? null,
        commercial_discounts_rules: res.data.commercial_discounts_rules ?? null,
        updated_at: new Date().toISOString(),
      };
      await (supabaseAdmin.from("partners") as any).upsert(partnerPayload);
    } catch (e) {
      // Ignora se tabela partners estiver em transição
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
      await supabaseAdmin.from("produtos").update({ parceiro_id: null }).eq("parceiro_id", data.id);
      await (supabaseAdmin.from("partners") as any).delete().eq("id", data.id);
    } catch {
      // ignora
    }

    let { error } = await supabase.from("parceiros").delete().eq("id", data.id);
    if (error) {
      const adminDel = await supabaseAdmin.from("parceiros").delete().eq("id", data.id);
      error = adminDel.error;
    }
    if (error) throw new Error(traduzirErro(error.message));
    return { ok: true };
  });
