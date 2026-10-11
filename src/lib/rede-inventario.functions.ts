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
 * Listar origens de inventário do tenant (Unifica Inventário Próprio e Parceiros de Mídia)
 */
export const listarOrigensInventario = createServerFn({ method: "GET" })
  .validator((d: { tipo_origem?: string; status?: string; busca?: string } | undefined) => d || {})
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      // 1. Consultar origens cadastradas na tabela rede_inventario
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

      const { data: origensDb = [], error: errOrigens } = await query;
      if (errOrigens) {
        console.warn("[listarOrigensInventario] Aviso na tabela rede_inventario:", errOrigens.message);
      }

      // 2. Consultar parceiros comerciais da tabela parceiros para unificação total
      let parceirosQuery = (supabaseAdmin as any)
        .from("parceiros")
        .select(`
          id,
          tenant_id,
          razao_social,
          nome_fantasia,
          cnpj,
          tipo_veiculo,
          segmentos,
          condicoes_comerciais,
          comissao_padrao_pct,
          comissao_padrao_percentual,
          contato_nome,
          contato_email,
          contato_telefone,
          ativo,
          status,
          observacoes,
          created_at,
          updated_at
        `)
        .order("razao_social", { ascending: true });

      if (tenantId) {
        parceirosQuery = parceirosQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: parceirosDb = [] } = await parceirosQuery;

      // 3. Consultar produtos para mapear contagem de produtos próprios e por parceiro
      let prodQuery = (supabaseAdmin as any)
        .from("produtos")
        .select("id, rede_inventario_id, parceiro_id, parceiro_nome, parceiro_cnpj, tipo_origem_inventario, origem_produto");

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: todosProdutos = [] } = await prodQuery;

      // Mapas de contagem de produtos
      const countPorOrigemOuParceiro: Record<string, number> = {};
      let totalProdutosProprios = 0;

      for (const p of todosProdutos || []) {
        const isParceiro = Boolean(
          p.parceiro_id ||
          p.parceiro_cnpj ||
          p.parceiro_nome ||
          p.tipo_origem_inventario === "REPRESENTADO" ||
          p.origem_produto === "PARCEIRO"
        );

        if (!isParceiro) {
          totalProdutosProprios++;
        }

        if (p.rede_inventario_id) {
          countPorOrigemOuParceiro[p.rede_inventario_id] = (countPorOrigemOuParceiro[p.rede_inventario_id] || 0) + 1;
        }
        if (p.parceiro_id && p.parceiro_id !== p.rede_inventario_id) {
          countPorOrigemOuParceiro[p.parceiro_id] = (countPorOrigemOuParceiro[p.parceiro_id] || 0) + 1;
        }
      }

      // 4. Consolidar Origens da Rede (Merge entre rede_inventario e parceiros)
      const origensMap = new Map<string, OrigemInventario>();

      // Adicionar origens já salvas na tabela rede_inventario
      for (const o of origensDb || []) {
        const prodCount = countPorOrigemOuParceiro[o.id] || 0;
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
          const prodCount = countPorOrigemOuParceiro[p.id] || 0;

          origensMap.set(p.id, {
            id: p.id,
            tenant_id: p.tenant_id,
            tipo_origem: "REPRESENTADO",
            nome_interno: p.razao_social,
            nome_comercial: p.nome_fantasia || p.razao_social,
            empresa: p.razao_social,
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
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const auth = await requireSupabaseAuth();
    const tenantId = auth.tenantId;

    try {
      let origem: OrigemInventario | null = null;

      // Caso especial: Nó de Inventário Próprio Padrão
      if (data.id === "origem-propria-default") {
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
          `);

        if (tenantId) {
          prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
        }

        const { data: todosProds } = await prodQuery;
        const prodsProprios = (todosProds || []).filter(
          (p: any) =>
            p.tipo_origem_inventario === "PROPRIO" ||
            (!p.rede_inventario_id && !p.parceiro_id)
        );

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
          produtos: prodsProprios as ProdutoVinculadoRede[],
        };
      }

      // Buscar na tabela rede_inventario
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
      } else {
        // Tentar obter da tabela parceiros
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
            nome_interno: parceiro.razao_social,
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

      // Buscar produtos vinculados a esta origem/parceiro
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
          tipo_origem_inventario,
          parceiro_id,
          parceiro_nome
        `)
        .or(`rede_inventario_id.eq.${data.id},parceiro_id.eq.${data.id}`);

      if (tenantId) {
        prodQuery = prodQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: produtos } = await prodQuery;

      return {
        origem: {
          ...origem,
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

/**
 * Sincronizar todos os parceiros cadastrados com a Rede de Inventário
 */
export const sincronizarParceirosComRedeInventario = createServerFn({ method: "POST" })
  .handler(async () => {
    const auth = await requireSupabaseAuth();
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

      let parceirosSincronizados = 0;

      // 2. Criar ou atualizar os nós em rede_inventario para cada parceiro
      for (const p of parceiros || []) {
        const contato = [p.contato_nome, p.contato_telefone, p.contato_email]
          .filter(Boolean)
          .join(" • ") || "Contato Comercial";

        const payload = {
          id: p.id,
          tenant_id: p.tenant_id || tenantId,
          tipo_origem: "REPRESENTADO",
          nome_interno: p.razao_social,
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

        const { error: upsertErr } = await (supabaseAdmin as any)
          .from("rede_inventario")
          .upsert(payload, { onConflict: "id" });

        if (!upsertErr) {
          parceirosSincronizados++;
        }
      }

      // 3. Conectar produtos que possuem parceiro_id ao seu nó de rede_inventario
      let updateProdsQuery = (supabaseAdmin as any)
        .from("produtos")
        .select("id, parceiro_id")
        .not("parceiro_id", "is", null)
        .is("rede_inventario_id", null);

      if (tenantId) {
        updateProdsQuery = updateProdsQuery.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
      }

      const { data: prodsParaLigar = [] } = await updateProdsQuery;
      let produtosVinculados = 0;

      for (const prod of prodsParaLigar || []) {
        if (prod.parceiro_id) {
          await (supabaseAdmin as any)
            .from("produtos")
            .update({
              rede_inventario_id: prod.parceiro_id,
              tipo_origem_inventario: "REPRESENTADO",
              origem_produto: "PARCEIRO",
            })
            .eq("id", prod.id);
          produtosVinculados++;
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

