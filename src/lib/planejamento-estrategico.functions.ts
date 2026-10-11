import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";

export interface PilaresEstrategicos {
  afinidade_territorial: number;
  frequencia: number;
  visibilidade: number;
  mobilidade: number;
  ativacao: number;
}

export const PILARES_DEFINICAO = [
  {
    key: "afinidade_territorial" as const,
    nome: "Afinidade Territorial",
    icone: "MapPin",
    cor: "text-amber-500",
    bgCor: "bg-amber-500/10",
    descricao: "Concentração em clusters demográficos e regiões de maior aderência ao público da marca.",
    dica: "Alinhamento com bairros de alta renda, centros de compras ou rotas de interesse.",
  },
  {
    key: "frequencia" as const,
    nome: "Frequência",
    icone: "Repeat",
    cor: "text-blue-500",
    bgCor: "bg-blue-500/10",
    descricao: "Repetição da mensagem ao longo da rotina diária para fixação e retenção de lembrança.",
    dica: "Circuitos digitais em loop e presença sequencial no trajeto residência-trabalho.",
  },
  {
    key: "visibilidade" as const,
    nome: "Visibilidade",
    icone: "Eye",
    cor: "text-emerald-500",
    bgCor: "bg-emerald-500/10",
    descricao: "Formatos de alto impacto visual, telas monumentais, empenas e ângulos de visão privilegiados.",
    dica: "Pontos com longo tempo de permanência visual e sem obstruções.",
  },
  {
    key: "mobilidade" as const,
    nome: "Mobilidade",
    icone: "Navigation",
    cor: "text-purple-500",
    bgCor: "bg-purple-500/10",
    descricao: "Capilaridade em eixos arteriais, vias de conexão expressa e fluxo veicular massivo.",
    dica: "Captura de audiência em movimento rápido nas principais artérias urbanas.",
  },
  {
    key: "ativacao" as const,
    nome: "Ativação",
    icone: "Zap",
    cor: "text-rose-500",
    bgCor: "bg-rose-500/10",
    descricao: "Geração de resposta imediata, conexão com pontos de venda ou chamada para ação digital.",
    dica: "Proximidade de lojas, restaurantes ou eventos com gatilhos de conversão direta.",
  },
];

export interface PontoMidiaPlanejamento {
  id?: string;
  campanha_id?: string;
  produto_id: string;
  regiao?: string | null;
  pilar_estrategico: "afinidade_territorial" | "frequencia" | "visibilidade" | "mobilidade" | "ativacao";
  quantidade_insercoes: number;
  valor_negociado: number;
  impactos_estimados: number;
  observacoes?: string | null;
  produto?: {
    id: string;
    nome: string;
    midia: string;
    tipo?: string | null;
    formato?: string | null;
    endereco_ponto?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    link_maps?: string | null;
    sentido_via?: string | null;
    ponto_referencia?: string | null;
    fotos?: string[] | null;
    parceiro_nome?: string | null;
    valor_unit?: number | null;
    impactos_mes_estimados?: number | null;
  };
}

export interface CampanhaPlanejamento {
  id: string;
  tenant_id?: string | null;
  cliente_id?: string | null;
  cliente_nome: string;
  nome_campanha: string;
  objetivo: string;
  publico_alvo: string;
  regiao: string;
  periodo_inicio: string;
  periodo_fim: string;
  investimento_previsto: number;
  estrategia: string;
  pilares: PilaresEstrategicos;
  regioes_selecionadas: string[];
  proposta_id?: string | null;
  status: "planejamento" | "em_aprovacao" | "proposta_gerada" | "ativa" | "concluida" | "arquivada";
  created_at?: string;
  updated_at?: string;
  pontos_midia?: PontoMidiaPlanejamento[];
  metricas_consolidadas?: {
    total_pontos: number;
    investimento_alocado: number;
    saldo_investimento: number;
    total_impactos: number;
    aderencia_pilares: number;
  };
}

const PilaresSchema = z.object({
  afinidade_territorial: z.number().min(0).max(10).default(7),
  frequencia: z.number().min(0).max(10).default(6),
  visibilidade: z.number().min(0).max(10).default(8),
  mobilidade: z.number().min(0).max(10).default(7),
  ativacao: z.number().min(0).max(10).default(5),
});

const PontoMidiaSchema = z.object({
  id: z.string().uuid().optional(),
  campanha_id: z.string().uuid().optional(),
  produto_id: z.string().uuid(),
  regiao: z.string().nullable().optional(),
  pilar_estrategico: z.enum([
    "afinidade_territorial",
    "frequencia",
    "visibilidade",
    "mobilidade",
    "ativacao",
  ]).default("visibilidade"),
  quantidade_insercoes: z.number().int().min(1).default(1),
  valor_negociado: z.number().min(0).default(0),
  impactos_estimados: z.number().min(0).default(0),
  observacoes: z.string().nullable().optional(),
});

const CampanhaSaveSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().min(1, "Nome do cliente é obrigatório"),
  nome_campanha: z.string().min(1, "Nome da campanha é obrigatório"),
  objetivo: z.string().default(""),
  publico_alvo: z.string().default(""),
  regiao: z.string().default(""),
  periodo_inicio: z.string().default(""),
  periodo_fim: z.string().default(""),
  investimento_previsto: z.number().min(0).default(0),
  estrategia: z.string().default(""),
  pilares: PilaresSchema.default({
    afinidade_territorial: 7,
    frequencia: 6,
    visibilidade: 8,
    mobilidade: 7,
    ativacao: 5,
  }),
  regioes_selecionadas: z.array(z.string()).default([]),
  status: z
    .enum(["planejamento", "em_aprovacao", "proposta_gerada", "ativa", "concluida", "arquivada"])
    .default("planejamento"),
  proposta_id: z.string().uuid().nullable().optional(),
  pontos_midia: z.array(PontoMidiaSchema).default([]),
});

export const listCampanhasPlanejamento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    let query = (supabase.from("campanhas_planejamento") as any)
      .select(`
        *,
        pontos:campanha_pontos_midia (
          id, produto_id, regiao, pilar_estrategico, quantidade_insercoes, valor_negociado, impactos_estimados, observacoes
        )
      `)
      .order("created_at", { ascending: false });

    if (tenantId) {
      query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("listCampanhasPlanejamento erro ou tabela não encontrada:", error.message);
      return [];
    }

    const campanhas = (data ?? []).map((row: any) => {
      const pontos = Array.isArray(row.pontos) ? row.pontos : [];
      const investimentoAlocado = pontos.reduce(
        (acc: number, p: any) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
        0
      );
      const totalImpactos = pontos.reduce(
        (acc: number, p: any) => acc + (Number(p.impactos_estimados) || 0),
        0
      );

      return {
        ...row,
        pilares: row.pilares || {
          afinidade_territorial: 7,
          frequencia: 6,
          visibilidade: 8,
          mobilidade: 7,
          ativacao: 5,
        },
        regioes_selecionadas: Array.isArray(row.regioes_selecionadas) ? row.regioes_selecionadas : [],
        pontos_midia: pontos,
        metricas_consolidadas: {
          total_pontos: pontos.length,
          investimento_alocado: investimentoAlocado,
          saldo_investimento: (Number(row.investimento_previsto) || 0) - investimentoAlocado,
          total_impactos: totalImpactos,
          aderencia_pilares: 85,
        },
      } as CampanhaPlanejamento;
    });

    return campanhas;
  });

export const getCampanhaPlanejamentoById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data: input, context }) => {
    const { supabase } = context;

    const { data: row, error } = await (supabase.from("campanhas_planejamento") as any)
      .select(`
        *,
        pontos:campanha_pontos_midia (
          id, campanha_id, produto_id, regiao, pilar_estrategico, quantidade_insercoes, valor_negociado, impactos_estimados, observacoes
        )
      `)
      .eq("id", input.id)
      .maybeSingle();

    if (error || !row) {
      throw new Error(error?.message || "Campanha de planejamento não encontrada");
    }

    // Enriquecer pontos de mídia com dados reais dos produtos existentes no inventário
    const pontos = Array.isArray(row.pontos) ? row.pontos : [];
    if (pontos.length > 0) {
      const prodIds = [...new Set(pontos.map((p: any) => p.produto_id).filter(Boolean))];
      if (prodIds.length > 0) {
        const { data: prods } = await (supabase.from("produtos") as any)
          .select("id, nome, midia, tipo, formato, endereco_ponto, latitude, longitude, link_maps, sentido_via, ponto_referencia, fotos, parceiro_nome, valor_unit, impactos_mes_estimados")
          .in("id", prodIds);

        const prodsMap = new Map((prods || []).map((p: any) => [p.id, p]));
        pontos.forEach((p: any) => {
          p.produto = prodsMap.get(p.produto_id) || null;
        });
      }
    }

    const investimentoAlocado = pontos.reduce(
      (acc: number, p: any) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
      0
    );
    const totalImpactos = pontos.reduce(
      (acc: number, p: any) => acc + (Number(p.impactos_estimados) || 0),
      0
    );

    return {
      ...row,
      pilares: row.pilares || {
        afinidade_territorial: 7,
        frequencia: 6,
        visibilidade: 8,
        mobilidade: 7,
        ativacao: 5,
      },
      regioes_selecionadas: Array.isArray(row.regioes_selecionadas) ? row.regioes_selecionadas : [],
      pontos_midia: pontos,
      metricas_consolidadas: {
        total_pontos: pontos.length,
        investimento_alocado: investimentoAlocado,
        saldo_investimento: (Number(row.investimento_previsto) || 0) - investimentoAlocado,
        total_impactos: totalImpactos,
        aderencia_pilares: 85,
      },
    } as CampanhaPlanejamento;
  });

export const saveCampanhaPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CampanhaSaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    const { pontos_midia, id, ...campanhaFields } = data;

    let campanhaId = id;

    const payloadCampanha = {
      ...campanhaFields,
      tenant_id: tenantId,
      created_by: userId,
      updated_at: new Date().toISOString(),
    };

    if (campanhaId) {
      const { error: updErr } = await (supabase.from("campanhas_planejamento") as any)
        .update(payloadCampanha)
        .eq("id", campanhaId);
      if (updErr) throw new Error(updErr.message);

      // Limpar pontos anteriores para reinserir atualizados
      await (supabase.from("campanha_pontos_midia") as any)
        .delete()
        .eq("campanha_id", campanhaId);
    } else {
      const { data: created, error: insErr } = await (supabase.from("campanhas_planejamento") as any)
        .insert(payloadCampanha)
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      campanhaId = created.id;
    }

    // Inserir pontos de mídia vinculados
    if (pontos_midia && pontos_midia.length > 0 && campanhaId) {
      const rowsPontos = pontos_midia.map((p) => ({
        tenant_id: tenantId,
        campanha_id: campanhaId,
        produto_id: p.produto_id,
        regiao: p.regiao || null,
        pilar_estrategico: p.pilar_estrategico,
        quantidade_insercoes: p.quantidade_insercoes || 1,
        valor_negociado: p.valor_negociado || 0,
        impactos_estimados: p.impactos_estimados || 0,
        observacoes: p.observacoes || null,
      }));

      const { error: pontosErr } = await (supabase.from("campanha_pontos_midia") as any)
        .insert(rowsPontos);

      if (pontosErr) {
        console.warn("Erro ao inserir pontos de mídia do planejamento:", pontosErr.message);
      }
    }

    return { id: campanhaId, ok: true };
  });

export const deleteCampanhaPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await (supabase.from("campanhas_planejamento") as any)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const gerarPropostaDoPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { campanha_id: string; validadeDias?: number }) => d)
  .handler(async ({ data: input, context }) => {
    const { supabase, userId } = context;

    // Buscar a campanha de planejamento
    const { data: campanha, error: cErr } = await (supabase.from("campanhas_planejamento") as any)
      .select(`
        *,
        pontos:campanha_pontos_midia (
          id, produto_id, regiao, pilar_estrategico, quantidade_insercoes, valor_negociado, impactos_estimados, observacoes
        )
      `)
      .eq("id", input.campanha_id)
      .single();

    if (cErr || !campanha) {
      throw new Error("Campanha não encontrada para geração de proposta.");
    }

    const pontos = Array.isArray(campanha.pontos) ? campanha.pontos : [];
    if (pontos.length === 0) {
      throw new Error("Adicione ao menos um ponto de mídia ao planejamento antes de gerar a proposta comercial.");
    }

    // Buscar produtos completos para enriquecer itens da proposta
    const prodIds = [...new Set(pontos.map((p: any) => p.produto_id).filter(Boolean))];
    const { data: prods } = await (supabase.from("produtos") as any)
      .select("*")
      .in("id", prodIds);

    const prodsMap = new Map((prods || []).map((p: any) => [p.id, p]));

    const validadeData = new Date();
    validadeData.setDate(validadeData.getDate() + (input.validadeDias || 15));
    const validadeStr = validadeData.toISOString().split("T")[0];

    let valorTabelaTotal = 0;
    let valorNegociadoTotal = 0;
    let totalInsercoesGeral = 0;

    const itensProposta = pontos.map((p: any) => {
      const prod = prodsMap.get(p.produto_id) || {};
      const qtdInsercoes = Number(p.quantidade_insercoes) || 1;
      const vUnit = Number(prod.valor_unit) || Number(p.valor_negociado) || 0;
      const vNegociado = Number(p.valor_negociado) || vUnit;
      const totalItem = vNegociado * qtdInsercoes;
      const totalTabelaItem = vUnit * qtdInsercoes;

      valorTabelaTotal += totalTabelaItem;
      valorNegociadoTotal += totalItem;
      totalInsercoesGeral += qtdInsercoes;

      return {
        tipo: prod.tipo || prod.midia || "OOH",
        programa: prod.nome || "Ponto de Mídia Estratégico",
        horario: prod.faixa || "Rotativo / 24h",
        formato: prod.formato || "Painel / Face",
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        insercoes_dia: qtdInsercoes,
        dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
        dias_mes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
        desconto: totalTabelaItem > totalItem ? ((totalTabelaItem - totalItem) / totalTabelaItem) * 100 : 0,
        valor_unit: vUnit,
        valor_tabela: totalTabelaItem,
        valor_negociado: totalItem,
        total_insercoes: qtdInsercoes,
        dias_veiculacao: 30,
        produto_id: prod.id || p.produto_id,
        parceiro_id: prod.parceiro_id || null,
        parceiro_nome: prod.parceiro_nome || null,
        parceiro_cnpj: prod.parceiro_cnpj || null,
        comissao_inquilino_pct: prod.comissao_inquilino_pct || 0,
        endereco_ponto: prod.endereco_ponto || null,
        latitude: prod.latitude || null,
        longitude: prod.longitude || null,
        link_maps: prod.link_maps || null,
        sentido_via: prod.sentido_via || null,
        ponto_referencia: prod.ponto_referencia || null,
        fotos: Array.isArray(prod.fotos) ? prod.fotos : [],
      };
    });

    const valorDesconto = Math.max(0, valorTabelaTotal - valorNegociadoTotal);

    // Criar proposta na tabela propostas
    const { data: propCreated, error: pErr } = await supabase
      .from("propostas")
      .insert({
        cliente_id: campanha.cliente_id || null,
        cliente_avulso: !campanha.cliente_id ? campanha.cliente_nome : null,
        campanha: campanha.nome_campanha,
        validade: validadeStr,
        observacao: `Proposta gerada a partir do Planejamento Estratégico "${campanha.nome_campanha}".\nEstratégia: ${campanha.estrategia || "N/A"}\nObjetivo: ${campanha.objetivo || "N/A"}`,
        status: "rascunho",
        valor_tabela: valorTabelaTotal,
        valor_desconto: valorDesconto,
        valor_negociado: valorNegociadoTotal,
        total_insercoes: totalInsercoesGeral,
        comissao_pct: 0,
        executivo_id: userId,
        created_by: userId,
      } as never)
      .select("id, numero")
      .single();

    if (pErr || !propCreated) {
      throw new Error(`Erro ao gerar proposta comercial: ${pErr?.message}`);
    }

    const propostaId = propCreated.id;

    // Inserir os itens da proposta
    const itensComPropId = itensProposta.map((it) => ({
      ...it,
      proposta_id: propostaId,
    }));

    const { error: itemsErr } = await supabase
      .from("proposta_itens")
      .insert(itensComPropId as never);

    if (itemsErr) {
      console.warn("Aviso ao salvar itens da proposta:", itemsErr.message);
    }

    // Atualizar a campanha com o id da proposta e status
    await (supabase.from("campanhas_planejamento") as any)
      .update({
        proposta_id: propostaId,
        status: "proposta_gerada",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campanha.id);

    return {
      ok: true,
      proposta_id: propostaId,
      proposta_numero: propCreated.numero,
    };
  });
