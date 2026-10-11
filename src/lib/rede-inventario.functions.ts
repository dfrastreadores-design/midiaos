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
 * Listar origens de inventário do tenant
 */
export const listarOrigensInventario = createServerFn({ method: "GET" })
  .validator((d: { tipo_origem?: string; status?: string; busca?: string } | undefined) => d || {})
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

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

      if (data?.tipo_origem && data.tipo_origem !== "todos") {
        query = query.eq("tipo_origem", data.tipo_origem);
      }

      if (data?.status && data.status !== "todos") {
        query = query.eq("status", data.status);
      }

      if (data?.busca && data.busca.trim()) {
        const termo = data.busca.trim();
        query = query.or(
          `nome_interno.ilike.%${termo}%,nome_comercial.ilike.%${termo}%,empresa.ilike.%${termo}%,cnpj.ilike.%${termo}%,contrato.ilike.%${termo}%`
        );
      }

      const { data: origens, error } = await query;

      if (error) {
        console.warn("[listarOrigensInventario] Erro ao consultar rede_inventario:", error.message);
        // Fallback resiliente com a tabela parceiros se a tabela ainda estiver sincronizando
        const { data: parceirosLegados } = await (supabaseAdmin as any)
          .from("parceiros")
          .select("id, tenant_id, razao_social, nome_fantasia, cnpj, condicoes_comerciais, comissao_padrao_pct, ativo, created_at, updated_at")
          .limit(100);

        const fallbackList: OrigemInventario[] = (parceirosLegados || []).map((p: any) => ({
          id: p.id,
          tenant_id: p.tenant_id,
          tipo_origem: "REPRESENTADO",
          nome_interno: p.razao_social,
          nome_comercial: p.nome_fantasia || p.razao_social,
          empresa: p.razao_social,
          cnpj: p.cnpj,
          contato: "Contato Comercial",
          contrato: p.condicoes_comerciais || "Contrato Padrão",
          comissao: Number(p.comissao_padrao_pct || 20),
          status: p.ativo ? "ativo" : "inativo",
          total_produtos: 0,
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));

        return fallbackList;
      }

      // Buscar contagem de produtos vinculados
      const origensIds = (origens || []).map((o: any) => o.id);
      const countMap: Record<string, number> = {};

      if (origensIds.length > 0) {
        const { data: prodCounts } = await (supabaseAdmin as any)
          .from("produtos")
          .select("rede_inventario_id, parceiro_id")
          .or(
            `rede_inventario_id.in.(${origensIds.join(",")}),parceiro_id.in.(${origensIds.join(",")})`
          );

        for (const item of prodCounts || []) {
          const matchedId = item.rede_inventario_id || item.parceiro_id;
          if (matchedId) {
            countMap[matchedId] = (countMap[matchedId] || 0) + 1;
          }
        }
      }

      return (origens || []).map((o: any) => ({
        ...o,
        comissao: Number(o.comissao || 0),
        total_produtos: countMap[o.id] || 0,
      })) as OrigemInventario[];
    } catch (err: any) {
      console.error("[listarOrigensInventario] Falha inesperada:", err);
      throw new Error(traduzirErro(err));
    }
  });

/**
 * Obter uma origem e seus produtos vinculados
 */
export const obterOrigemInventario = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      const { data: origem, error } = await (supabaseAdmin as any)
        .from("rede_inventario")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      if (error || !origem) {
        // Tentar obter da tabela parceiros legada
        const { data: parceiro } = await (supabaseAdmin as any)
          .from("parceiros")
          .select("*")
          .eq("id", data.id)
          .maybeSingle();

        if (!parceiro) {
          throw new Error("Origem de inventário não encontrada.");
        }

        origem.id = parceiro.id;
        origem.tipo_origem = "REPRESENTADO";
        origem.nome_interno = parceiro.razao_social;
        origem.nome_comercial = parceiro.nome_fantasia || parceiro.razao_social;
        origem.empresa = parceiro.razao_social;
        origem.cnpj = parceiro.cnpj;
        origem.comissao = Number(parceiro.comissao_padrao_pct || 20);
        origem.status = parceiro.ativo ? "ativo" : "inativo";
      }

      // Buscar produtos vinculados
      let prodQuery = (supabaseAdmin as any)
        .from("produtos")
        .select(`
          id,
          nome,
          midia,
          tipo,
          valor_unit,
          valor_negociado,
          praca,
          status_operacional,
          foto_principal,
          rede_inventario_id,
          tipo_origem_inventario
        `)
        .or(`rede_inventario_id.eq.${data.id},parceiro_id.eq.${data.id}`);

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: produtos } = await prodQuery;

      return {
        origem: {
          ...origem,
          comissao: Number(origem.comissao || 0),
          total_produtos: (produtos || []).length,
        } as OrigemInventario,
        produtos: (produtos || []) as ProdutoVinculadoRede[],
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
  .validator((d: z.infer<typeof OrigemInventarioSchema>) => OrigemInventarioSchema.parse(d))
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      const payload: Record<string, any> = {
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
        payload.id = data.id;
      } else {
        payload.created_by = auth.userId;
      }

      const { data: saved, error } = await (supabaseAdmin as any)
        .from("rede_inventario")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        console.error("[salvarOrigemInventario] Erro no upsert:", error.message);
        throw new Error(`Falha ao salvar origem de inventário: ${error.message}`);
      }

      return {
        success: true,
        origem: saved as OrigemInventario,
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
  .validator((d: { origem_id: string; produto_ids: string[]; tipo_origem: OrigemInventarioTipo }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      if (!data.produto_ids || data.produto_ids.length === 0) {
        return { success: true, count: 0 };
      }

      let updateQuery = (supabaseAdmin as any)
        .from("produtos")
        .update({
          rede_inventario_id: data.origem_id,
          tipo_origem_inventario: data.tipo_origem,
          // Se for representado, manter parceiro_id sincronizado para total retrocompatibilidade
          parceiro_id: data.tipo_origem === "REPRESENTADO" ? data.origem_id : null,
          updated_at: new Date().toISOString(),
        })
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
  .validator((d: { produto_id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      let updateQuery = (supabaseAdmin as any)
        .from("produtos")
        .update({
          rede_inventario_id: null,
          tipo_origem_inventario: "PROPRIO",
          parceiro_id: null,
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
  .validator((d: { origem_id?: string; busca?: string } | undefined) => d || {})
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      let query = (supabaseAdmin as any)
        .from("produtos")
        .select(`
          id,
          nome,
          midia,
          tipo,
          valor_unit,
          valor_negociado,
          praca,
          status_operacional,
          foto_principal,
          rede_inventario_id,
          tipo_origem_inventario
        `)
        .order("nome", { ascending: true })
        .limit(200);

      if (tenantId) {
        query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      if (data?.busca && data.busca.trim()) {
        const termo = data.busca.trim();
        query = query.or(`nome.ilike.%${termo}%,midia.ilike.%${termo}%,praca.ilike.%${termo}%`);
      }

      const { data: produtos, error } = await query;

      if (error) {
        console.warn("[listarProdutosParaVinculo] Erro:", error.message);
        return [];
      }

      return (produtos || []).map((p: any) => ({
        ...p,
        vinculado_nesta_origem: data?.origem_id ? p.rede_inventario_id === data.origem_id : false,
      }));
    } catch (err: any) {
      console.error("[listarProdutosParaVinculo] Falha:", err);
      return [];
    }
  });

/**
 * Excluir ou inativar origem de inventário
 */
export const excluirOrigemInventario = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      // 1. Desvincular produtos antes de remover
      await (supabaseAdmin as any)
        .from("produtos")
        .update({
          rede_inventario_id: null,
          tipo_origem_inventario: "PROPRIO",
          parceiro_id: null,
          updated_at: new Date().toISOString(),
        })
        .or(`rede_inventario_id.eq.${data.id},parceiro_id.eq.${data.id}`);

      // 2. Excluir da tabela rede_inventario
      let deleteQuery = (supabaseAdmin as any).from("rede_inventario").delete().eq("id", data.id);
      if (tenantId) {
        deleteQuery = deleteQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error("[excluirOrigemInventario] Erro:", error.message);
        throw new Error(`Erro ao excluir origem: ${error.message}`);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[excluirOrigemInventario] Falha:", err);
      throw new Error(traduzirErro(err));
    }
  });
