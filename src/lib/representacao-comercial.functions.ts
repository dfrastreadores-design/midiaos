import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { traduzirErro } from "./error-translator";
import type {
  Partner,
  MediaServiceCatalogItem,
  PartnerStatus,
  TipoCobrancaRepresentacao,
} from "@/types/representacao-comercial.types";

const nullableString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null));

export const PartnerSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1, "Razão Social é obrigatória").max(200),
  nome_fantasia: nullableString(200),
  cnpj: nullableString(30),
  logo_url: nullableString(1000),
  contato_nome: nullableString(150),
  email: z
    .string()
    .email("E-mail inválido")
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  telefone: nullableString(40),
  site: nullableString(300),
  tipo_veiculo: z.string().default("Painel OOH/DOOH"),
  comissao_padrao_percentual: z.number().min(0).max(100).default(20.0),
  status: z.enum(["ativo", "inativo", "em_negociacao"]).default("ativo"),
  observacoes: nullableString(2000),
  endereco: nullableString(300),
  bairro: nullableString(150),
  cidade: nullableString(100),
  uf: nullableString(10),
  cep: nullableString(20),
  redes_sociais: z.record(z.any()).optional().nullable(),
});

export const MediaCatalogItemSchema = z.object({
  id: z.string().uuid().optional(),
  partner_id: z.string().uuid().optional().nullable(),
  is_own_product: z.boolean().default(false),
  nome_produto: z.string().min(1, "Nome do espaço/serviço é obrigatório").max(200),
  categoria_midia: z.string().min(1, "Categoria de mídia é obrigatória"),
  tipo_cobranca: z
    .enum(["insercao", "diaria", "semanal", "quinzenal", "mensal", "por_clique", "cpm"])
    .default("insercao"),
  valor_tabela: z.number().min(0, "Valor de tabela deve ser positivo"),
  valor_negociado_minimo: z.number().min(0).optional().nullable(),
  comissao_percentual_especifica: z.number().min(0).max(100).optional().nullable(),
  quantidade_disponivel: z.number().int().min(0).default(1),
  estoque_espacos: z.number().int().min(0).default(1),
  endereco: nullableString(300),
  bairro: nullableString(150),
  cidade: nullableString(100),
  estado: nullableString(10),
  cep: nullableString(20),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  especificacoes_tecnicas: z.record(z.any()).optional().nullable(),
  fotos: z.array(z.string().max(2000)).default([]),
  imagem_url: nullableString(1000),
  ativo: z.boolean().default(true),
});

/**
 * 1. LISTAR VEÍCULOS DE COMUNICAÇÃO PARCEIROS
 */
export const listPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Obter tenant_id
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // Buscar na tabela partners
    let query = (supabase.from("partners") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }

    const { data: partnersData, error: partnersError } = await query;

    // Se partners ainda estiver vazio ou der erro de tabela recém-criada, enriquecer com parceiros
    let partners: Partner[] = (partnersData as Partner[]) || [];

    if (!partnersError && partners.length === 0) {
      // Buscar da tabela parceiros legada para retrocompatibilidade sem perda
      let legQuery = (supabase.from("parceiros") as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (tenantId) {
        legQuery = legQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
      }
      const { data: legData } = await legQuery;
      if (legData && legData.length > 0) {
        partners = legData.map((p: any) => ({
          id: p.id,
          tenant_id: p.tenant_id,
          razao_social: p.razao_social,
          nome_fantasia: p.nome_fantasia,
          cnpj: p.cnpj,
          logo_url: p.logo_url || null,
          contato_nome: p.contato_nome,
          email: p.contato_email,
          telefone: p.contato_telefone,
          site: p.site,
          tipo_veiculo: p.tipo_veiculo || (p.segmentos?.[0] ? p.segmentos[0] : "Painel OOH/DOOH"),
          comissao_padrao_percentual: Number(p.comissao_padrao_pct || p.comissao_padrao_percentual || 20),
          status: (p.ativo === false ? "inativo" : "ativo") as PartnerStatus,
          observacoes: p.observacoes,
          endereco: p.endereco,
          bairro: p.bairro,
          cidade: p.cidade,
          uf: p.uf,
          cep: p.cep,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
      }
    }

    // Calcular estatísticas de produtos/espaços vinculados por parceiro
    try {
      let prodQuery = (supabase.from("produtos") as any)
        .select("id, parceiro_id, valor_unit, comissao_inquilino_pct");
      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
      }
      const { data: produtos } = await prodQuery;

      let catalogQuery = (supabase.from("media_services_catalog") as any)
        .select("id, partner_id, valor_tabela, comissao_percentual_especifica");
      if (tenantId) {
        catalogQuery = catalogQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
      }
      const { data: catalogItems } = await catalogQuery;

      const countMap: Record<string, { count: number; totalValor: number; comissaoSoma: number }> = {};

      if (produtos) {
        for (const pr of produtos) {
          if (!pr.parceiro_id) continue;
          if (!countMap[pr.parceiro_id]) {
            countMap[pr.parceiro_id] = { count: 0, totalValor: 0, comissaoSoma: 0 };
          }
          countMap[pr.parceiro_id].count++;
          countMap[pr.parceiro_id].totalValor += Number(pr.valor_unit || 0);
          countMap[pr.parceiro_id].comissaoSoma += Number(pr.comissao_inquilino_pct || 20);
        }
      }

      if (catalogItems) {
        for (const item of catalogItems) {
          if (!item.partner_id) continue;
          if (!countMap[item.partner_id]) {
            countMap[item.partner_id] = { count: 0, totalValor: 0, comissaoSoma: 0 };
          }
          countMap[item.partner_id].count++;
          countMap[item.partner_id].totalValor += Number(item.valor_tabela || 0);
          countMap[item.partner_id].comissaoSoma += Number(item.comissao_percentual_especifica || 20);
        }
      }

      partners = partners.map((p) => {
        const stats = countMap[p.id];
        return {
          ...p,
          produtos_count: stats?.count || 0,
          produtos_valor_total: stats?.totalValor || 0,
          comissao_media: stats?.count ? stats.comissaoSoma / stats.count : p.comissao_padrao_percentual,
        };
      });
    } catch {
      // Ignora erro no join de contagem
    }

    return partners;
  });

/**
 * 2. SALVAR/ATUALIZAR PARCEIRO (UPSERT)
 */
export const upsertPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => PartnerSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    const payload: any = {
      ...data,
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    // 1. Inserir ou atualizar na tabela partners
    const client = supabaseAdmin || supabase;
    const { data: savedPartner, error } = await (client.from("partners") as any)
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error("Erro ao salvar parceiro em partners:", error);
      throw new Error(traduzirErro(error.message));
    }

    // 2. Sincronizar na tabela parceiros legada para compatibilidade contínua
    try {
      const legPayload: any = {
        id: savedPartner.id,
        tenant_id: tenantId,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj,
        site: data.site,
        logo_url: data.logo_url,
        contato_nome: data.contato_nome,
        contato_email: data.email,
        contato_telefone: data.telefone,
        tipo_veiculo: data.tipo_veiculo,
        comissao_padrao_pct: data.comissao_padrao_percentual,
        comissao_padrao_percentual: data.comissao_padrao_percentual,
        status: data.status,
        ativo: data.status === "ativo",
        observacoes: data.observacoes,
        endereco: data.endereco,
        cidade: data.cidade,
        uf: data.uf,
        cep: data.cep,
        updated_at: new Date().toISOString(),
      };
      await (client.from("parceiros") as any).upsert(legPayload);
    } catch (e) {
      console.warn("Aviso na sincronização legada parceiros:", e);
    }

    return savedPartner as Partner;
  });

/**
 * 3. EXCLUIR PARCEIRO
 */
export const deletePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;
    const client = supabaseAdmin || supabase;

    let q = (client.from("partners") as any).delete().eq("id", data.id);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    await q;

    try {
      let qLeg = (client.from("parceiros") as any).delete().eq("id", data.id);
      if (tenantId) qLeg = qLeg.eq("tenant_id", tenantId);
      await qLeg;
    } catch {}

    return { success: true };
  });

/**
 * 4. LISTAR CATÁLOGO DE ESPAÇOS E SERVIÇOS PUBLICITÁRIOS
 */
export const listMediaCatalog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        search: z.string().optional(),
        categoria_midia: z.string().optional(),
        origem: z.enum(["all", "proprio", "parceiro"]).optional().default("all"),
        tipo_cobranca: z.string().optional(),
        cidade: z.string().optional(),
        estado: z.string().optional(),
        partner_id: z.string().uuid().optional(),
      })
      .optional()
      .parse(d || {})
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // Consulta à tabela media_services_catalog
    let query = (supabase.from("media_services_catalog") as any)
      .select("*, partner:partners(id, nome_fantasia, razao_social, logo_url, tipo_veiculo, comissao_padrao_percentual)")
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }

    if (data?.categoria_midia && data.categoria_midia !== "all") {
      query = query.eq("categoria_midia", data.categoria_midia);
    }

    if (data?.origem === "proprio") {
      query = query.eq("is_own_product", true);
    } else if (data?.origem === "parceiro") {
      query = query.eq("is_own_product", false);
    }

    if (data?.tipo_cobranca && data.tipo_cobranca !== "all") {
      query = query.eq("tipo_cobranca", data.tipo_cobranca);
    }

    if (data?.cidade) {
      query = query.ilike("cidade", `%${data.cidade}%`);
    }

    if (data?.estado && data.estado !== "all") {
      query = query.eq("estado", data.estado);
    }

    if (data?.partner_id) {
      query = query.eq("partner_id", data.partner_id);
    }

    if (data?.search && data.search.trim()) {
      query = query.ilike("nome_produto", `%${data.search.trim()}%`);
    }

    const { data: items, error } = await query;

    if (error) {
      console.warn("Aviso ao consultar media_services_catalog:", error);
    }

    return (items || []) as MediaServiceCatalogItem[];
  });

/**
 * 5. SALVAR ITEM NO CATÁLOGO (UPSERT)
 */
export const upsertMediaCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => MediaCatalogItemSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // Se for produto próprio, remove partner_id
    const isOwn = data.is_own_product;
    const partnerId = isOwn ? null : data.partner_id || null;

    const payload: any = {
      ...data,
      is_own_product: isOwn,
      partner_id: partnerId,
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    const client = supabaseAdmin || supabase;
    const { data: savedItem, error } = await (client.from("media_services_catalog") as any)
      .upsert(payload)
      .select("*, partner:partners(id, nome_fantasia, razao_social, logo_url, tipo_veiculo, comissao_padrao_percentual)")
      .single();

    if (error) {
      console.error("Erro ao salvar no media_services_catalog:", error);
      throw new Error(traduzirErro(error.message));
    }

    // Sincronização automática na tabela produtos para que o item apareça imediatamente em Propostas e PI
    try {
      let partnerInfo: any = null;
      if (partnerId) {
        const { data: p } = await (client.from("partners") as any)
          .select("id, razao_social, nome_fantasia, cnpj, comissao_padrao_percentual")
          .eq("id", partnerId)
          .maybeSingle();
        partnerInfo = p;
      }

      const produtoPayload: any = {
        tenant_id: tenantId,
        nome: data.nome_produto,
        midia: data.categoria_midia,
        tipo: data.tipo_cobranca,
        valor_unit: data.valor_tabela,
        ativo: data.ativo,
        origem_produto: isOwn ? "PROPRIO" : "PARCEIRO",
        is_own_product: isOwn,
        tipo_cobranca: data.tipo_cobranca,
        valor_tabela: data.valor_tabela,
        valor_negociado_minimo: data.valor_negociado_minimo || null,
        comissao_percentual_especifica: data.comissao_percentual_especifica || null,
        comissao_inquilino_pct: data.comissao_percentual_especifica || partnerInfo?.comissao_padrao_percentual || 20,
        parceiro_id: partnerId,
        parceiro_nome: partnerInfo?.nome_fantasia || partnerInfo?.razao_social || null,
        parceiro_cnpj: partnerInfo?.cnpj || null,
        endereco_ponto: data.endereco,
        cep: data.cep,
        latitude: data.latitude,
        longitude: data.longitude,
        fotos: data.fotos || [],
        duracao_segundos: (data.especificacoes_tecnicas as any)?.duracao_segundos || 30,
        insercoes_padrao: 1,
        estoque_espacos: data.estoque_espacos,
        detalhes_venda: JSON.stringify({
          _origem_catalogo_id: savedItem.id,
          _especificacoes_tecnicas: data.especificacoes_tecnicas,
        }),
      };

      await (client.from("produtos") as any).upsert(produtoPayload);
    } catch (syncErr) {
      console.warn("Aviso ao sincronizar catálogo com tabela produtos:", syncErr);
    }

    return savedItem as MediaServiceCatalogItem;
  });

/**
 * 6. EXCLUIR ITEM DO CATÁLOGO
 */
export const deleteMediaCatalogItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;
    const client = supabaseAdmin || supabase;

    let q = (client.from("media_services_catalog") as any).delete().eq("id", data.id);
    if (tenantId) q = q.eq("tenant_id", tenantId);
    await q;

    return { success: true };
  });

/**
 * 7. ESTATÍSTICAS RESUMIDAS DO CATÁLOGO E REPRESENTAÇÃO
 */
export const getMediaCatalogStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    let q = (supabase.from("media_services_catalog") as any).select("*");
    if (tenantId) q = q.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    const { data: catalogItems } = await q;

    let pQ = (supabase.from("partners") as any).select("id, status");
    if (tenantId) pQ = pQ.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    const { data: partnersList } = await pQ;

    const totalItens = catalogItems?.length || 0;
    let totalProprios = 0;
    let totalParceiros = 0;
    let somaTabela = 0;
    let somaComissoes = 0;
    let contagemComissoes = 0;

    if (catalogItems) {
      for (const item of catalogItems) {
        if (item.is_own_product) totalProprios++;
        else totalParceiros++;
        somaTabela += Number(item.valor_tabela || 0);
        if (item.comissao_percentual_especifica) {
          somaComissoes += Number(item.comissao_percentual_especifica);
          contagemComissoes++;
        }
      }
    }

    return {
      totalItens,
      totalProprios,
      totalParceiros,
      somaTabela,
      comissaoMedia: contagemComissoes ? somaComissoes / contagemComissoes : 20.0,
      totalParceirosAtivos: partnersList?.filter((p: any) => p.status === "ativo").length || 0,
      totalParceirosNegociacao: partnersList?.filter((p: any) => p.status === "em_negociacao").length || 0,
    };
  });

/**
 * 8. OBTER PRAÇAS, ESTADOS E CIDADES DINÂMICAS DO CATÁLOGO DE MÍDIAS
 */
export const getDistinctPracasECidades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    let q = (supabase.from("media_services_catalog") as any)
      .select("cidade, estado, bairro")
      .eq("ativo", true);

    if (tenantId) q = q.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    const { data: catalogLocs } = await q;

    // Também consultar produtos gerais para unificar cobertura
    let qProd = (supabase.from("produtos") as any)
      .select("cidade, estado, endereco_ponto, regiao_macro")
      .eq("ativo", true);
    if (tenantId) qProd = qProd.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    const { data: prodLocs } = await qProd;

    const estadosSet = new Set<string>();
    const cidadesSet = new Set<string>();
    const cidadesPorEstado: Record<string, string[]> = {};

    const addLocation = (cid?: string | null, est?: string | null) => {
      const uf = (est || "").trim().toUpperCase();
      const city = (cid || "").trim();
      if (uf) estadosSet.add(uf);
      if (city) {
        cidadesSet.add(city);
        if (uf) {
          if (!cidadesPorEstado[uf]) cidadesPorEstado[uf] = [];
          if (!cidadesPorEstado[uf].includes(city)) cidadesPorEstado[uf].push(city);
        }
      }
    };

    catalogLocs?.forEach((item: any) => addLocation(item.cidade, item.estado));
    prodLocs?.forEach((item: any) => addLocation(item.cidade, item.estado));

    const ufsCadastradas = Array.from(estadosSet).sort();
    const cidadesCadastradas = Array.from(cidadesSet).sort();

    return {
      ufsCadastradas,
      cidadesCadastradas,
      cidadesPorEstado,
    };
  });

