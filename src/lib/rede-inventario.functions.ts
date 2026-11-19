import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { traduzirErro } from "./error-translator";

export type OrigemInventarioTipo = "PROPRIO" | "REPRESENTADO";
export type OrigemInventarioStatus = "ativo" | "inativo" | "em_negociacao";

export interface OrigemInventario {
  id: string;
  tenant_id?: string | null;
  tipo_origem: OrigemInventarioTipo;
  nome_interno: string;
  nome_comercial: string;
  empresa?: string | null;
  cnpj?: string | null;
  contato?: string | null;
  contrato?: string | null;
  comissao: number;
  status: OrigemInventarioStatus;
  observacoes?: string | null;
  total_produtos?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProdutoVinculadoRede {
  id: string;
  nome: string;
  midia: string;
  tipo: string;
  valor_unit: number;
  valor_negociado?: number | null;
  praca?: string | null;
  status_operacional?: string | null;
  foto_principal?: string | null;
  rede_inventario_id?: string | null;
  tipo_origem_inventario?: string | null;
  parceiro_id?: string | null;
  parceiro_nome?: string | null;
}

const nullableString = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null));

export const OrigemInventarioSchema = z.object({
  id: z.string().uuid().optional(),
  tipo_origem: z.enum(["PROPRIO", "REPRESENTADO"]).default("REPRESENTADO"),
  nome_interno: z.string().min(1, "Nome interno é obrigatório").max(200),
  nome_comercial: z.string().min(1, "Nome comercial é obrigatório").max(200),
  empresa: nullableString(200),
  cnpj: nullableString(30),
  contato: nullableString(300),
  contrato: nullableString(200),
  comissao: z.number().min(0, "Comissão mínima é 0%").max(100, "Comissão máxima é 100%").default(20.0),
  status: z.enum(["ativo", "inativo", "em_negociacao"]).default("ativo"),
  observacoes: nullableString(2000),
});

/**
 * Normaliza os campos de um produto do Supabase para o formato esperado pelo frontend
 */
function normalizarProdutoRede(p: any): ProdutoVinculadoRede {
  let fotoPrincipal: string | null = null;
  if (Array.isArray(p.fotos) && p.fotos.length > 0) {
    fotoPrincipal = p.fotos[0];
  } else if (typeof p.fotos === "string" && p.fotos.trim()) {
    fotoPrincipal = p.fotos.trim();
  }

  const parceiroId = p.parceiro_id || p.partner_id || null;
  const tipoOrigem = parceiroId ? "REPRESENTADO" : "PROPRIO";
  const praca = [p.cidade, p.uf].filter(Boolean).join(" - ") || null;
  const statusOp = p.ativo === false ? "inativo" : (p.status || "ativo");

  return {
    id: p.id,
    nome: p.nome || "Produto sem nome",
    midia: p.midia || "OOH",
    tipo: p.tipo || "Geral",
    valor_unit: Number(p.valor_unit || 0),
    valor_negociado: Number(p.preco_tabela || p.valor_unit || 0),
    praca,
    status_operacional: statusOp,
    foto_principal: fotoPrincipal,
    rede_inventario_id: parceiroId,
    tipo_origem_inventario: tipoOrigem,
    parceiro_id: parceiroId,
    parceiro_nome: p.parceiro_nome || null,
  };
}

/**
 * Listar origens de inventário do tenant (Unifica Inventário Próprio e Parceiros de Mídia)
 */
export const listarOrigensInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { tipo_origem?: string; status?: string; busca?: string } | undefined) => d || {})
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      // 1. Tentar consultar origens cadastradas na tabela rede_inventario (se existir no schema)
      let origensDb: any[] = [];
      try {
        let query = (supabaseAdmin as any)
          .from("rede_inventario")
          .select(`
            id,
            tenant_id,
            tipo_origem,
            nome_interno,
            nome_comercial,
            empresa,
            cnpj,
            contato,
            contrato,
            comissao,
            status,
            observacoes,
            created_at,
            updated_at
          `)
          .order("created_at", { ascending: false });

        if (tenantId) {
          query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        }

        const { data: resOrigens, error: errOrigens } = await query;
        if (!errOrigens && resOrigens) {
          origensDb = resOrigens;
        }
      } catch (err: any) {
        // Tabela rede_inventario pode não existir no schema cache; prossegue com parceiros
        console.warn("[listarOrigensInventario] rede_inventario não disponível:", err?.message || err);
      }

      // 2. Consultar parceiros comerciais da tabela parceiros para unificação total
      let parceirosQuery = (supabaseAdmin as any)
        .from("parceiros")
        .select("*")
        .order("razao_social", { ascending: true });

      if (tenantId) {
        parceirosQuery = parceirosQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: parceirosDb = [], error: errParc } = await parceirosQuery;
      if (errParc) {
        console.warn("[listarOrigensInventario] Erro ao consultar parceiros:", errParc.message);
      }

      // 3. Consultar produtos para mapear contagem de produtos próprios e por parceiro
      // Usar apenas colunas reais da tabela produtos
      let prodQuery = (supabaseAdmin as any)
        .from("produtos")
        .select("id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, valor_unit, preco_tabela, ativo, status");

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: todosProdutos = [], error: errProd } = await prodQuery;
      if (errProd) {
        console.warn("[listarOrigensInventario] Erro ao consultar produtos:", errProd.message);
      }

      // Mapas de contagem de produtos
      let totalProdutosProprios = 0;
      const cleanDigits = (v: any) => String(v || "").replace(/\D/g, "");
      const normText = (v: any) => String(v || "").toLowerCase().trim();

      for (const p of todosProdutos || []) {
        const isParceiro = Boolean(p.parceiro_id || p.partner_id || p.parceiro_cnpj || p.parceiro_nome);
        if (!isParceiro) {
          totalProdutosProprios++;
        }
      }

      // Função utilitária para contar produtos de um parceiro de forma abrangente
      const calcularProdutosDoParceiro = (parcId: string, cnpj?: string | null, nomeFantasia?: string | null, razaoSocial?: string | null) => {
        const idAlvo = parcId;
        const cnpjAlvo = cleanDigits(cnpj);
        const nomeFantasiaAlvo = normText(nomeFantasia);
        const razaoSocialAlvo = normText(razaoSocial);

        return (todosProdutos || []).filter((p: any) => {
          if (p.parceiro_id === idAlvo || p.partner_id === idAlvo) return true;
          if (cnpjAlvo && p.parceiro_cnpj && cleanDigits(p.parceiro_cnpj) === cnpjAlvo) return true;
          if (p.parceiro_nome) {
            const prodNome = normText(p.parceiro_nome);
            if (nomeFantasiaAlvo && prodNome === nomeFantasiaAlvo) return true;
            if (razaoSocialAlvo && prodNome === razaoSocialAlvo) return true;
            if (nomeFantasiaAlvo && (prodNome.includes(nomeFantasiaAlvo) || nomeFantasiaAlvo.includes(prodNome))) return true;
          }
          return false;
        }).length;
      };

      // 4. Consolidar Origens da Rede (Merge entre rede_inventario e parceiros)
      const origensMap = new Map<string, OrigemInventario>();

      // Adicionar origens já salvas na tabela rede_inventario (se houver)
      for (const o of origensDb || []) {
        const prodCount = calcularProdutosDoParceiro(o.id, o.cnpj, o.nome_comercial, o.nome_interno);
        origensMap.set(o.id, {
          ...o,
          comissao: Number(o.comissao || 0),
          total_produtos: prodCount,
        });
      }

      // Adicionar parceiros cadastrados que ainda não estão explicitamente na rede de inventário
      for (const p of parceirosDb || []) {
        if (!origensMap.has(p.id)) {
          const contatoFormatado = [p.contato_nome, p.contato_telefone, p.contato_email]
            .filter(Boolean)
            .join(" • ") || "Contato Comercial";

          const comissao = Number(p.comissao_padrao_pct ?? p.comissao_padrao_percentual ?? 20);
          const status = p.ativo === false ? "inativo" : (p.status || "ativo");
          const prodCount = calcularProdutosDoParceiro(p.id, p.cnpj, p.nome_fantasia, p.razao_social);

          origensMap.set(p.id, {
            id: p.id,
            tenant_id: p.tenant_id,
            tipo_origem: "REPRESENTADO",
            nome_interno: p.razao_social || p.nome_fantasia || "Parceiro de Mídia",
            nome_comercial: p.nome_fantasia || p.razao_social || "Parceiro de Mídia",
            empresa: p.razao_social || p.nome_fantasia || null,
            cnpj: p.cnpj || null,
            contato: contatoFormatado,
            contrato: p.condicoes_comerciais || "Contrato de Representação",
            comissao: comissao,
            status: status as OrigemInventarioStatus,
            observacoes: p.observacoes || (p.segmentos?.length ? `Mídias: ${p.segmentos.join(", ")}` : null),
            total_produtos: prodCount,
            created_at: p.created_at,
            updated_at: p.updated_at,
          });
        }
      }

      // 5. Garantir existência de nó padrão "PROPRIO" se não houver nenhum
      const temOrigemPropria = Array.from(origensMap.values()).some((o) => o.tipo_origem === "PROPRIO");
      if (!temOrigemPropria) {
        origensMap.set("origem-propria-default", {
          id: "origem-propria-default",
          tenant_id: tenantId,
          tipo_origem: "PROPRIO",
          nome_interno: "Inventário Próprio da Empresa",
          nome_comercial: "Inventário Próprio (Mídia Direta)",
          empresa: "Operação Direta da Empresa",
          cnpj: null,
          contato: "Equipe de Operações",
          contrato: "Titularidade Direta",
          comissao: 0,
          status: "ativo",
          observacoes: "Veículos, painéis e inventários próprios de titularidade direta da sua empresa.",
          total_produtos: totalProdutosProprios,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      let listaConsolidada = Array.from(origensMap.values());

      // 6. Aplicar filtros em memória
      if (data?.tipo_origem && data.tipo_origem !== "todos") {
        listaConsolidada = listaConsolidada.filter((o) => o.tipo_origem === data.tipo_origem);
      }

      if (data?.status && data.status !== "todos") {
        listaConsolidada = listaConsolidada.filter((o) => o.status === data.status);
      }

      if (data?.busca && data.busca.trim()) {
        const termo = data.busca.trim().toLowerCase();
        listaConsolidada = listaConsolidada.filter((o) =>
          [o.nome_interno, o.nome_comercial, o.empresa, o.cnpj, o.contrato, o.contato]
            .filter(Boolean)
            .some((campo) => String(campo).toLowerCase().includes(termo))
        );
      }

      return listaConsolidada;
    } catch (err: any) {
      console.error("[listarOrigensInventario] Falha inesperada:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Obter uma origem e seus produtos vinculados (compatível com parceiros e inventário próprio)
 */
export const obterOrigemInventario = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      let origem: OrigemInventario | null = null;

      // Caso especial: Nó de Inventário Próprio Padrão
      if (data.id === "origem-propria-default") {
        let prodQuery = (supabaseAdmin as any)
          .from("produtos")
          .select("id, nome, midia, tipo, valor_unit, preco_tabela, ativo, status, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, fotos, cidade, uf");

        if (tenantId) {
          prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        }

        const { data: todosProds = [] } = await prodQuery;
        const prodsProprios = (todosProds || [])
          .filter((p: any) => !p.parceiro_id && !p.partner_id)
          .map(normalizarProdutoRede);

        return {
          origem: {
            id: "origem-propria-default",
            tenant_id: tenantId,
            tipo_origem: "PROPRIO",
            nome_interno: "Inventário Próprio da Empresa",
            nome_comercial: "Inventário Próprio (Mídia Direta)",
            empresa: "Operação Direta da Empresa",
            cnpj: null,
            contato: "Equipe de Operações",
            contrato: "Titularidade Direta",
            comissao: 0,
            status: "ativo",
            observacoes: "Veículos e pontos de mídia próprios da sua empresa.",
            total_produtos: prodsProprios.length,
          } as OrigemInventario,
          produtos: prodsProprios,
        };
      }

      // 1. Tentar buscar na tabela rede_inventario se existir
      try {
        const { data: origemDb } = await (supabaseAdmin as any)
          .from("rede_inventario")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();

        if (origemDb) {
          origem = {
            ...origemDb,
            comissao: Number(origemDb.comissao || 0),
          };
        }
      } catch {}

      // 2. Se não encontrou em rede_inventario, buscar na tabela parceiros
      if (!origem) {
        const { data: parceiro } = await (supabaseAdmin as any)
          .from("parceiros")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();

        if (parceiro) {
          origem = {
            id: parceiro.id,
            tenant_id: parceiro.tenant_id,
            tipo_origem: "REPRESENTADO",
            nome_interno: parceiro.razao_social || parceiro.nome_fantasia,
            nome_comercial: parceiro.nome_fantasia || parceiro.razao_social,
            empresa: parceiro.razao_social,
            cnpj: parceiro.cnpj || null,
            contato: [parceiro.contato_nome, parceiro.contato_telefone, parceiro.contato_email]
              .filter(Boolean)
              .join(" • ") || "Contato Comercial",
            contrato: parceiro.condicoes_comerciais || "Contrato Padrão",
            comissao: Number(parceiro.comissao_padrao_pct || parceiro.comissao_padrao_percentual || 20),
            status: parceiro.ativo === false ? "inativo" : (parceiro.status || "ativo"),
            observacoes: parceiro.observacoes || null,
          };
        }
      }

      if (!origem) {
        throw new Error("Origem de inventário ou parceiro não encontrado.");
      }

      // 3. Buscar produtos vinculados a esta origem/parceiro
      let prodQuery = (supabaseAdmin as any)
        .from("produtos")
        .select("id, nome, midia, tipo, valor_unit, preco_tabela, ativo, status, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, fotos, cidade, uf");

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: todosProds = [] } = await prodQuery;

      const cleanDigits = (v: any) => String(v || "").replace(/\D/g, "");
      const normText = (v: any) => String(v || "").toLowerCase().trim();

      const cnpjAlvo = cleanDigits(origem.cnpj);
      const nomeComercialAlvo = normText(origem.nome_comercial);
      const nomeInternoAlvo = normText(origem.nome_interno);
      const empresaAlvo = normText(origem.empresa);

      const produtosFiltrados = (todosProds || []).filter((p: any) => {
        if (p.parceiro_id === data.id || p.partner_id === data.id) return true;
        if (cnpjAlvo && p.parceiro_cnpj && cleanDigits(p.parceiro_cnpj) === cnpjAlvo) return true;
        if (p.parceiro_nome) {
          const prodNome = normText(p.parceiro_nome);
          if (nomeComercialAlvo && prodNome === nomeComercialAlvo) return true;
          if (nomeInternoAlvo && prodNome === nomeInternoAlvo) return true;
          if (empresaAlvo && prodNome === empresaAlvo) return true;
          if (nomeComercialAlvo && (prodNome.includes(nomeComercialAlvo) || nomeComercialAlvo.includes(prodNome))) return true;
        }
        return false;
      });

      const produtos = produtosFiltrados.map(normalizarProdutoRede);

      return {
        origem: {
          ...origem,
          total_produtos: produtos.length,
        } as OrigemInventario,
        produtos,
      };
    } catch (err: any) {
      console.error("[obterOrigemInventario] Erro:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Salvar ou atualizar origem de inventário
 */
export const salvarOrigemInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: z.infer<typeof OrigemInventarioSchema>) => OrigemInventarioSchema.parse(d))
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      // 1. Tentar salvar na tabela rede_inventario caso exista
      const payloadRede: Record<string, any> = {
        tenant_id: tenantId,
        tipo_origem: data.tipo_origem,
        nome_interno: data.nome_interno.trim(),
        nome_comercial: data.nome_comercial.trim(),
        empresa: data.empresa?.trim() || null,
        cnpj: data.cnpj?.trim() || null,
        contato: data.contato?.trim() || null,
        contrato: data.contrato?.trim() || null,
        comissao: data.comissao,
        status: data.status,
        observacoes: data.observacoes?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (data.id) {
        payloadRede.id = data.id;
      } else {
        payloadRede.created_by = auth.userId;
      }

      try {
        const { data: savedRede, error: errRede } = await (supabaseAdmin as any)
          .from("rede_inventario")
          .upsert(payloadRede, { onConflict: "id" })
          .select()
          .single();

        if (!errRede && savedRede) {
          return {
            success: true,
            origem: savedRede as OrigemInventario,
          };
        }
      } catch {
        // Fallback para parceiros se rede_inventario não existir
      }

      // 2. Se a origem for do tipo REPRESENTADO ou falhou em rede_inventario, persistir em parceiros
      const parceiroPayload: Record<string, any> = {
        tenant_id: tenantId,
        razao_social: data.empresa?.trim() || data.nome_interno.trim(),
        nome_fantasia: data.nome_comercial.trim(),
        cnpj: data.cnpj?.trim() || null,
        contato_nome: data.contato?.trim() || null,
        condicoes_comerciais: data.contrato?.trim() || null,
        comissao_padrao_pct: data.comissao,
        ativo: data.status === "ativo",
        observacoes: data.observacoes?.trim() || null,
        updated_at: new Date().toISOString(),
      };

      let savedParceiro: any = null;
      if (data.id) {
        const { data: updated, error: updErr } = await (supabaseAdmin as any)
          .from("parceiros")
          .update(parceiroPayload)
          .eq("id", data.id)
          .select()
          .single();
        if (updErr) throw updErr;
        savedParceiro = updated;
      } else {
        parceiroPayload.created_by = auth.userId;
        const { data: inserted, error: insErr } = await (supabaseAdmin as any)
          .from("parceiros")
          .insert(parceiroPayload)
          .select()
          .single();
        if (insErr) throw insErr;
        savedParceiro = inserted;
      }

      const origemResult: OrigemInventario = {
        id: savedParceiro.id,
        tenant_id: savedParceiro.tenant_id,
        tipo_origem: data.tipo_origem,
        nome_interno: savedParceiro.razao_social,
        nome_comercial: savedParceiro.nome_fantasia || savedParceiro.razao_social,
        empresa: savedParceiro.razao_social,
        cnpj: savedParceiro.cnpj,
        contato: savedParceiro.contato_nome,
        contrato: savedParceiro.condicoes_comerciais,
        comissao: Number(savedParceiro.comissao_padrao_pct || 20),
        status: savedParceiro.ativo ? "ativo" : "inativo",
        observacoes: savedParceiro.observacoes,
        created_at: savedParceiro.created_at,
        updated_at: savedParceiro.updated_at,
      };

      return {
        success: true,
        origem: origemResult,
      };
    } catch (err: any) {
      console.error("[salvarOrigemInventario] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Vincular múltiplos produtos a uma origem de inventário
 */
export const vincularProdutosOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { origem_id: string; produto_ids: string[]; tipo_origem: OrigemInventarioTipo }) => d)
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      if (!data.produto_ids || data.produto_ids.length === 0) {
        return { success: true, count: 0 };
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (data.tipo_origem === "REPRESENTADO") {
        updateData.parceiro_id = data.origem_id;
        updateData.partner_id = data.origem_id;
      } else {
        updateData.parceiro_id = null;
        updateData.partner_id = null;
      }

      let updateQuery = (supabaseAdmin as any)
        .from("produtos")
        .update(updateData)
        .in("id", data.produto_ids);

      if (tenantId) {
        updateQuery = updateQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { error } = await updateQuery;

      if (error) {
        console.error("[vincularProdutosOrigem] Erro:", error.message);
        throw new Error(`Erro ao associar produtos: ${error.message}`);
      }

      return {
        success: true,
        count: data.produto_ids.length,
      };
    } catch (err: any) {
      console.error("[vincularProdutosOrigem] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Desvincular um produto de sua origem de inventário
 */
export const desvincularProdutoOrigem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { produto_id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      let updateQuery = (supabaseAdmin as any)
        .from("produtos")
        .update({
          parceiro_id: null,
          partner_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.produto_id);

      if (tenantId) {
        updateQuery = updateQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { error } = await updateQuery;

      if (error) {
        console.error("[desvincularProdutoOrigem] Erro:", error.message);
        throw new Error(`Erro ao desvincular produto: ${error.message}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[desvincularProdutoOrigem] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Listar produtos do catálogo disponíveis para associação
 */
export const listarProdutosParaVinculo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { origem_id?: string; busca?: string } | undefined) => d || {})
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      let query = (supabaseAdmin as any)
        .from("produtos")
        .select("id, nome, midia, tipo, valor_unit, preco_tabela, ativo, status, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj, fotos, cidade, uf")
        .order("nome", { ascending: true })
        .limit(200);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      if (data?.busca && data.busca.trim()) {
        const termo = data.busca.trim();
        query = query.or(`nome.ilike.%${termo}%,midia.ilike.%${termo}%,cidade.ilike.%${termo}%`);
      }

      const { data: produtosRaw = [], error } = await query;

      if (error) {
        console.warn("[listarProdutosParaVinculo] Erro:", error.message);
        return [];
      }

      return (produtosRaw || []).map((p: any) => {
        const norm = normalizarProdutoRede(p);
        const vinculadoNestaOrigem = Boolean(
          data?.origem_id &&
          (p.parceiro_id === data.origem_id || p.partner_id === data.origem_id)
        );
        return {
          ...norm,
          vinculado_nesta_origem: vinculadoNestaOrigem,
        };
      });
    } catch (err: any) {
      console.error("[listarProdutosParaVinculo] Falha:", err);
      return [];
    }
  });

/**
 * Excluir ou inativar origem de inventário
 */
export const excluirOrigemInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      // 1. Desvincular produtos antes de remover
      await (supabaseAdmin as any)
        .from("produtos")
        .update({
          parceiro_id: null,
          partner_id: null,
          updated_at: new Date().toISOString(),
        })
        .or(`parceiro_id.eq.${data.id},partner_id.eq.${data.id}`);

      // 2. Excluir da tabela rede_inventario caso exista
      try {
        let deleteRede = (supabaseAdmin as any).from("rede_inventario").delete().eq("id", data.id);
        if (tenantId) deleteRede = deleteRede.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        await deleteRede;
      } catch {}

      // 3. Inativar na tabela parceiros
      let updateParc = (supabaseAdmin as any)
        .from("parceiros")
        .update({ ativo: false, updated_at: new Date().toISOString() })
        .eq("id", data.id);

      if (tenantId) updateParc = updateParc.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      await updateParc;

      return { success: true };
    } catch (err: any) {
      console.error("[excluirOrigemInventario] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Sincronizar todos os parceiros cadastrados com a Rede de Inventário
 */
export const sincronizarParceirosComRedeInventario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }: any) => {
    const auth = context?.auth || (await requireSupabaseAuth());
    const tenantId = auth.tenantId;

    try {
      // 1. Obter todos os parceiros do tenant
      let pQuery = (supabaseAdmin as any)
        .from("parceiros")
        .select("*");

      if (tenantId) {
        pQuery = pQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: parceiros = [], error: errP } = await pQuery;
      if (errP) {
        throw new Error(`Erro ao buscar parceiros: ${errP.message}`);
      }

      let parceirosSincronizados = parceiros.length;

      // 2. Tentar sincronizar nós na tabela rede_inventario (se a tabela existir no banco)
      try {
        for (const p of parceiros || []) {
          const contato = [p.contato_nome, p.contato_telefone, p.contato_email]
            .filter(Boolean)
            .join(" • ") || "Contato Comercial";

          const payload = {
            id: p.id,
            tenant_id: p.tenant_id || tenantId,
            tipo_origem: "REPRESENTADO",
            nome_interno: p.razao_social || p.nome_fantasia,
            nome_comercial: p.nome_fantasia || p.razao_social,
            empresa: p.razao_social,
            cnpj: p.cnpj || null,
            contato,
            contrato: p.condicoes_comerciais || "Contrato de Representação",
            comissao: Number(p.comissao_padrao_pct ?? p.comissao_padrao_percentual ?? 20),
            status: p.ativo === false ? "inativo" : (p.status || "ativo"),
            observacoes: p.observacoes || (p.segmentos?.length ? `Mídias: ${p.segmentos.join(", ")}` : null),
            updated_at: new Date().toISOString(),
          };

          await (supabaseAdmin as any)
            .from("rede_inventario")
            .upsert(payload, { onConflict: "id" });
        }
      } catch (err) {
        // Tabela rede_inventario não existe; os parceiros já são a fonte unificada de verdade
        console.info("[sincronizarParceirosComRedeInventario] Info: parceiros utilizados como fonte direta de rede.");
      }

      // 3. Normalizar conexão de produtos por parceiro (reconciliar parceiro_id / partner_id / cnpj / nome)
      let prodQuery = (supabaseAdmin as any)
        .from("produtos")
        .select("id, parceiro_id, partner_id, parceiro_nome, parceiro_cnpj");

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: todosProds = [] } = await prodQuery;

      // Mapear parceiros por id, por CNPJ limpo e por nome limpo
      const parceiroById = new Map<string, any>();
      const parceiroByCnpj = new Map<string, any>();
      const parceiroByNome = new Map<string, any>();

      for (const p of parceiros || []) {
        if (p.id) parceiroById.set(p.id, p);
        if (p.cnpj) {
          const clean = p.cnpj.replace(/\D/g, "");
          if (clean) parceiroByCnpj.set(clean, p);
        }
        if (p.nome_fantasia) parceiroByNome.set(p.nome_fantasia.toLowerCase().trim(), p);
        if (p.razao_social) parceiroByNome.set(p.razao_social.toLowerCase().trim(), p);
      }

      let produtosVinculados = 0;

      for (const prod of todosProds || []) {
        let pMatch = null;
        if (prod.parceiro_id && parceiroById.has(prod.parceiro_id)) {
          pMatch = parceiroById.get(prod.parceiro_id);
        } else if (prod.partner_id && parceiroById.has(prod.partner_id)) {
          pMatch = parceiroById.get(prod.partner_id);
        } else if (prod.parceiro_cnpj) {
          const clean = prod.parceiro_cnpj.replace(/\D/g, "");
          if (clean && parceiroByCnpj.has(clean)) {
            pMatch = parceiroByCnpj.get(clean);
          }
        } else if (prod.parceiro_nome) {
          const nomeNorm = prod.parceiro_nome.toLowerCase().trim();
          if (parceiroByNome.has(nomeNorm)) {
            pMatch = parceiroByNome.get(nomeNorm);
          }
        }

        if (pMatch) {
          produtosVinculados++;
          // Se o produto não tinha parceiro_id gravado, atualiza para manter consistência
          if (!prod.parceiro_id || !prod.partner_id) {
            await (supabaseAdmin as any)
              .from("produtos")
              .update({
                parceiro_id: pMatch.id,
                partner_id: pMatch.id,
                parceiro_nome: pMatch.nome_fantasia || pMatch.razao_social,
                parceiro_cnpj: pMatch.cnpj || prod.parceiro_cnpj,
                updated_at: new Date().toISOString(),
              })
              .eq("id", prod.id);
          }
        }
      }

      return {
        success: true,
        parceirosSincronizados,
        produtosVinculados,
      };
    } catch (err: any) {
      console.error("[sincronizarParceirosComRedeInventario] Erro:", err);
      throw new Error(traduzirErro(err));
    }
  });
