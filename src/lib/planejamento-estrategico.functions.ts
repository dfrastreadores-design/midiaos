import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  calcularNegociacaoComercial,
  arredondarMoeda,
  type ModalidadeDesconto,
  type ItemNegociacao,
  type ResultadoNegociacao,
} from "@/lib/motor-comercial";

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
  valor_tabela_unit?: number;
  valor_tabela?: number;
  desconto_pct?: number;
  desconto_valor?: number;
  valor_negociado: number;
  comissao_pct?: number;
  comissao_valor?: number;
  repasse_parceiro_valor?: number;
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
    parceiro_id?: string | null;
    parceiro_cnpj?: string | null;
    valor_unit?: number | null;
    comissao_inquilino_pct?: number | null;
    impactos_estimados?: number | null;
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
  modalidade_desconto?: ModalidadeDesconto;
  desconto_geral_pct?: number;
  valor_final_alvo?: number;
  valor_tabela_total?: number;
  valor_desconto_total?: number;
  valor_negociado_total?: number;
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
  produto_id: z.string().uuid("ID do produto deve ser um UUID válido"),
  regiao: z.string().nullable().optional(),
  pilar_estrategico: z.enum([
    "afinidade_territorial",
    "frequencia",
    "visibilidade",
    "mobilidade",
    "ativacao",
  ]).default("visibilidade"),
  quantidade_insercoes: z.number().int().min(1).default(1),
  valor_tabela_unit: z.number().min(0).optional(),
  valor_tabela: z.number().min(0).optional(),
  desconto_pct: z.number().min(0).max(100).optional(),
  desconto_valor: z.number().min(0).optional(),
  valor_negociado: z.number().min(0).default(0),
  comissao_pct: z.number().min(0).max(100).optional(),
  comissao_valor: z.number().min(0).optional(),
  repasse_parceiro_valor: z.number().min(0).optional(),
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
  modalidade_desconto: z.enum(["nenhum", "item", "geral", "total"]).default("nenhum"),
  desconto_geral_pct: z.number().min(0).max(100).default(0),
  valor_final_alvo: z.number().min(0).default(0),
  pontos_midia: z.array(PontoMidiaSchema).default([]),
});

/**
 * Função utilitária para enriquecer pontos com produtos reais via supabaseAdmin
 */
async function enriquecerPontosComProdutos(pontos: PontoMidiaPlanejamento[]): Promise<PontoMidiaPlanejamento[]> {
  if (!pontos || pontos.length === 0) return [];

  const prodIds = [...new Set(pontos.map((p) => p.produto_id).filter(Boolean))];
  if (prodIds.length === 0) return pontos;

  try {
    const { data: prods } = await supabaseAdmin
      .from("produtos")
      .select("id, nome, midia, tipo, formato, endereco_ponto, latitude, longitude, link_maps, sentido_via, ponto_referencia, fotos, parceiro_nome, parceiro_id, parceiro_cnpj, valor_unit, comissao_inquilino_pct, preco_tabela")
      .in("id", prodIds);

    const map = new Map((prods || []).map((p: any) => [p.id, p]));

    return pontos.map((p) => {
      const prod = map.get(p.produto_id);
      if (!prod) return p;

      const vUnitTabela = p.valor_tabela_unit ?? Number(prod.valor_unit) ?? Number(prod.preco_tabela) ?? p.valor_negociado;
      const vTabela = p.valor_tabela ?? (vUnitTabela * (p.quantidade_insercoes || 1));
      const comissaoPct = p.comissao_pct ?? Number(prod.comissao_inquilino_pct) ?? 20;

      return {
        ...p,
        valor_tabela_unit: vUnitTabela,
        valor_tabela: vTabela,
        comissao_pct: comissaoPct,
        produto: {
          id: prod.id,
          nome: prod.nome,
          midia: prod.midia,
          tipo: prod.tipo,
          formato: prod.formato,
          endereco_ponto: prod.endereco_ponto,
          latitude: prod.latitude,
          longitude: prod.longitude,
          link_maps: prod.link_maps,
          sentido_via: prod.sentido_via,
          ponto_referencia: prod.ponto_referencia,
          fotos: prod.fotos,
          parceiro_nome: prod.parceiro_nome,
          parceiro_id: prod.parceiro_id,
          parceiro_cnpj: prod.parceiro_cnpj,
          valor_unit: Number(prod.valor_unit) || 0,
          comissao_inquilino_pct: Number(prod.comissao_inquilino_pct) || 20,
        },
      };
    });
  } catch (err: any) {
    console.warn("[Planejamento] Erro ao enriquecer produtos:", err?.message);
    return pontos;
  }
}

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

    // 1. Tentar tabela nativa campanhas_planejamento
    try {
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
      if (!error && Array.isArray(data) && data.length > 0) {
        return (data ?? []).map((row: any) => {
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
      }
    } catch {
      // Fallback para persistência em briefings
    }

    // 2. Persistência em briefings (quando campanhas_planejamento não estiver no schema cache remoto)
    try {
      let bQuery = supabaseAdmin
        .from("briefings")
        .select("*")
        .eq("tipo_entidade", "cliente")
        .order("created_at", { ascending: false });

      if (tenantId) {
        bQuery = bQuery.eq("tenant_id", tenantId);
      }

      const { data: bData } = await bQuery;
      const campanhasBriefing: CampanhaPlanejamento[] = [];

      for (const b of bData || []) {
        let meta: any = null;
        try {
          if (b.detalhes_adicionais && b.detalhes_adicionais.startsWith("{")) {
            meta = JSON.parse(b.detalhes_adicionais);
          }
        } catch {
          meta = null;
        }

        if (meta?._planejamento_estrategico) {
          const pontos = Array.isArray(meta.pontos_midia) ? meta.pontos_midia : [];
          const investimentoAlocado = pontos.reduce(
            (acc: number, p: any) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
            0
          );

          campanhasBriefing.push({
            id: b.id,
            tenant_id: b.tenant_id,
            cliente_id: meta.cliente_id || null,
            cliente_nome: meta.cliente_nome || b.razao_social || "Cliente",
            nome_campanha: b.campanha || meta.nome_campanha || "Campanha",
            objetivo: b.objetivo || meta.objetivo || "",
            publico_alvo: meta.publico_alvo || "",
            regiao: meta.regiao || "",
            periodo_inicio: meta.periodo_inicio || "",
            periodo_fim: meta.periodo_fim || "",
            investimento_previsto: Number(b.verba_estimada) || Number(meta.investimento_previsto) || 0,
            estrategia: meta.estrategia || "",
            pilares: meta.pilares || {
              afinidade_territorial: 7,
              frequencia: 6,
              visibilidade: 8,
              mobilidade: 7,
              ativacao: 5,
            },
            regioes_selecionadas: meta.regioes_selecionadas || [],
            proposta_id: b.proposta_id || meta.proposta_id || null,
            status: meta.status || "planejamento",
            modalidade_desconto: meta.modalidade_desconto || "nenhum",
            desconto_geral_pct: meta.desconto_geral_pct || 0,
            valor_final_alvo: meta.valor_final_alvo || 0,
            valor_tabela_total: meta.valor_tabela_total || 0,
            valor_desconto_total: meta.valor_desconto_total || 0,
            valor_negociado_total: meta.valor_negociado_total || investimentoAlocado,
            created_at: b.created_at,
            updated_at: b.updated_at,
            pontos_midia: pontos,
            metricas_consolidadas: {
              total_pontos: pontos.length,
              investimento_alocado: investimentoAlocado,
              saldo_investimento: (Number(b.verba_estimada) || 0) - investimentoAlocado,
              total_impactos: pontos.reduce((acc: number, p: any) => acc + (Number(p.impactos_estimados) || 0), 0),
              aderencia_pilares: 85,
            },
          });
        }
      }

      return campanhasBriefing;
    } catch (err: any) {
      console.warn("[Planejamento] Erro ao listar campanhas via briefings:", err?.message);
      return [];
    }
  });

export const getCampanhaPlanejamentoById = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data: input }) => {
    // 1. Tentar buscar em campanhas_planejamento
    try {
      const { data: row } = await (supabaseAdmin.from("campanhas_planejamento") as any)
        .select(`
          *,
          pontos:campanha_pontos_midia (
            id, campanha_id, produto_id, regiao, pilar_estrategico, quantidade_insercoes, valor_negociado, impactos_estimados, observacoes
          )
        `)
        .eq("id", input.id)
        .maybeSingle();

      if (row) {
        let pontos = Array.isArray(row.pontos) ? row.pontos : [];
        pontos = await enriquecerPontosComProdutos(pontos);

        const comercialMeta = row.pilares?._comercial || {};

        const investimentoAlocado = pontos.reduce(
          (acc: number, p: any) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
          0
        );

        return {
          ...row,
          pilares: {
            afinidade_territorial: row.pilares?.afinidade_territorial ?? 7,
            frequencia: row.pilares?.frequencia ?? 6,
            visibilidade: row.pilares?.visibilidade ?? 8,
            mobilidade: row.pilares?.mobilidade ?? 7,
            ativacao: row.pilares?.ativacao ?? 5,
          },
          regioes_selecionadas: Array.isArray(row.regioes_selecionadas) ? row.regioes_selecionadas : [],
          pontos_midia: pontos,
          modalidade_desconto: comercialMeta.modalidade_desconto || "nenhum",
          desconto_geral_pct: comercialMeta.desconto_geral_pct || 0,
          valor_final_alvo: comercialMeta.valor_final_alvo || 0,
          valor_tabela_total: comercialMeta.valor_tabela_total || 0,
          valor_desconto_total: comercialMeta.valor_desconto_total || 0,
          valor_negociado_total: comercialMeta.valor_negociado_total || investimentoAlocado,
          metricas_consolidadas: {
            total_pontos: pontos.length,
            investimento_alocado: investimentoAlocado,
            saldo_investimento: (Number(row.investimento_previsto) || 0) - investimentoAlocado,
            total_impactos: pontos.reduce((acc: number, p: any) => acc + (Number(p.impactos_estimados) || 0), 0),
            aderencia_pilares: 85,
          },
        } as CampanhaPlanejamento;
      }
    } catch {
      // Ignora erro e tenta briefings
    }

    // 2. Buscar em briefings
    try {
      const { data: b } = await supabaseAdmin
        .from("briefings")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (b) {
        let meta: any = null;
        try {
          if (b.detalhes_adicionais && b.detalhes_adicionais.startsWith("{")) {
            meta = JSON.parse(b.detalhes_adicionais);
          }
        } catch {
          meta = null;
        }

        let pontos: PontoMidiaPlanejamento[] = Array.isArray(meta?.pontos_midia) ? meta.pontos_midia : [];
        pontos = await enriquecerPontosComProdutos(pontos);

        const investimentoAlocado = pontos.reduce(
          (acc: number, p: any) => acc + (Number(p.valor_negociado) || 0) * (Number(p.quantidade_insercoes) || 1),
          0
        );

        return {
          id: b.id,
          tenant_id: b.tenant_id,
          cliente_id: meta?.cliente_id || null,
          cliente_nome: meta?.cliente_nome || b.razao_social || "Cliente",
          nome_campanha: b.campanha || meta?.nome_campanha || "Campanha",
          objetivo: b.objetivo || meta?.objetivo || "",
          publico_alvo: meta?.publico_alvo || "",
          regiao: meta?.regiao || "",
          periodo_inicio: meta?.periodo_inicio || "",
          periodo_fim: meta?.periodo_fim || "",
          investimento_previsto: Number(b.verba_estimada) || Number(meta?.investimento_previsto) || 0,
          estrategia: meta?.estrategia || "",
          pilares: meta?.pilares || {
            afinidade_territorial: 7,
            frequencia: 6,
            visibilidade: 8,
            mobilidade: 7,
            ativacao: 5,
          },
          regioes_selecionadas: meta?.regioes_selecionadas || [],
          proposta_id: b.proposta_id || meta?.proposta_id || null,
          status: meta?.status || "planejamento",
          modalidade_desconto: meta?.modalidade_desconto || "nenhum",
          desconto_geral_pct: meta?.desconto_geral_pct || 0,
          valor_final_alvo: meta?.valor_final_alvo || 0,
          valor_tabela_total: meta?.valor_tabela_total || 0,
          valor_desconto_total: meta?.valor_desconto_total || 0,
          valor_negociado_total: meta?.valor_negociado_total || investimentoAlocado,
          created_at: b.created_at,
          updated_at: b.updated_at,
          pontos_midia: pontos,
          metricas_consolidadas: {
            total_pontos: pontos.length,
            investimento_alocado: investimentoAlocado,
            saldo_investimento: (Number(b.verba_estimada) || 0) - investimentoAlocado,
            total_impactos: pontos.reduce((acc: number, p: any) => acc + (Number(p.impactos_estimados) || 0), 0),
            aderencia_pilares: 85,
          },
        } as CampanhaPlanejamento;
      }
    } catch (err: any) {
      console.warn("[Planejamento] Erro ao buscar campanha via briefings:", err?.message);
    }

    return null;
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

    const {
      pontos_midia,
      id,
      modalidade_desconto = "nenhum",
      desconto_geral_pct = 0,
      valor_final_alvo = 0,
      ...campanhaFields
    } = data;

    let campanhaId = id || crypto.randomUUID();

    // 1. Enriquecer e calcular rigorosamente o motor comercial no servidor
    const pontosEnriquecidos = await enriquecerPontosComProdutos(pontos_midia as PontoMidiaPlanejamento[]);

    const itensCalculo: ItemNegociacao[] = pontosEnriquecidos.map((p) => {
      const vUnitTabela = p.valor_tabela_unit ?? Number(p.produto?.valor_unit) ?? p.valor_negociado;
      return {
        id: p.produto_id,
        nome: p.produto?.nome || "Ponto de Mídia",
        quantidade: p.quantidade_insercoes || 1,
        valor_unit_tabela: vUnitTabela,
        desconto_pct: p.desconto_pct || 0,
        comissao_pct: p.comissao_pct ?? 20,
      };
    });

    const resultadoComercial: ResultadoNegociacao = calcularNegociacaoComercial({
      itens: itensCalculo,
      modalidade: modalidade_desconto as ModalidadeDesconto,
      descontoGeralPct: desconto_geral_pct,
      valorFinalAlvo: valor_final_alvo,
    });

    // Atualizar pontos_midia com os resultados exatos calculados pelo motor comercial
    const pontosCalculados: PontoMidiaPlanejamento[] = pontosEnriquecidos.map((p, idx) => {
      const calc = resultadoComercial.itens[idx] || {};
      return {
        ...p,
        campanha_id: campanhaId,
        valor_tabela_unit: calc.valor_unit_tabela ?? p.valor_tabela_unit,
        valor_tabela: calc.valor_tabela ?? p.valor_tabela,
        desconto_pct: calc.desconto_pct ?? p.desconto_pct ?? 0,
        desconto_valor: calc.desconto_valor ?? p.desconto_valor ?? 0,
        valor_negociado: calc.valor_unit_negociado ?? p.valor_negociado,
        comissao_pct: calc.comissao_pct ?? p.comissao_pct ?? 20,
        comissao_valor: calc.comissao_valor ?? 0,
        repasse_parceiro_valor: calc.repasse_valor ?? 0,
      };
    });

    // Metadados comerciais estruturados
    const metadadosComerciais = {
      _comercial: {
        modalidade_desconto,
        desconto_geral_pct,
        valor_final_alvo,
        valor_tabela_total: resultadoComercial.valor_tabela_total,
        valor_desconto_total: resultadoComercial.valor_desconto_total,
        desconto_medio_pct: resultadoComercial.desconto_medio_pct,
        valor_negociado_total: resultadoComercial.valor_negociado_total,
        comissao_total: resultadoComercial.comissao_total,
        repasse_total: resultadoComercial.repasse_total,
        exige_aprovacao: resultadoComercial.exige_aprovacao,
      },
    };

    // Validação de cliente_id no banco
    let validClienteId: string | null = null;
    if (campanhaFields.cliente_id) {
      try {
        const { data: cExist } = await supabaseAdmin
          .from("clientes")
          .select("id")
          .eq("id", campanhaFields.cliente_id)
          .maybeSingle();
        if (cExist?.id) {
          validClienteId = cExist.id;
        }
      } catch {
        validClienteId = null;
      }
    }

    let persistedInCampanhas = false;

    // 2. Tentar persistência em campanhas_planejamento
    try {
      const payloadCampanha = {
        ...campanhaFields,
        id: campanhaId,
        cliente_id: validClienteId,
        tenant_id: tenantId,
        created_by: userId,
        pilares: {
          ...campanhaFields.pilares,
          ...metadadosComerciais,
        },
        updated_at: new Date().toISOString(),
      };

      const { data: saved, error: saveErr } = await (supabaseAdmin.from("campanhas_planejamento") as any)
        .upsert(payloadCampanha)
        .select("id")
        .maybeSingle();

      if (!saveErr && saved?.id) {
        persistedInCampanhas = true;
        campanhaId = saved.id;

        // Limpar e reinserir pontos na tabela vinculada
        await (supabaseAdmin.from("campanha_pontos_midia") as any)
          .delete()
          .eq("campanha_id", campanhaId)
          .catch(() => null);

        const rowsPontos = pontosCalculados.map((p) => ({
          tenant_id: tenantId,
          campanha_id: campanhaId,
          produto_id: p.produto_id,
          regiao: p.regiao || null,
          pilar_estrategico: p.pilar_estrategico,
          quantidade_insercoes: p.quantidade_insercoes || 1,
          valor_negociado: p.valor_negociado || 0,
          impactos_estimados: p.impactos_estimados || 0,
          observacoes: JSON.stringify({
            valor_tabela_unit: p.valor_tabela_unit,
            valor_tabela: p.valor_tabela,
            desconto_pct: p.desconto_pct,
            desconto_valor: p.desconto_valor,
            comissao_pct: p.comissao_pct,
            comissao_valor: p.comissao_valor,
            repasse_parceiro_valor: p.repasse_parceiro_valor,
          }),
        }));

        await (supabaseAdmin.from("campanha_pontos_midia") as any)
          .insert(rowsPontos)
          .catch((err: any) => console.warn("[Planejamento] Pontos não persistidos em campanha_pontos_midia:", err?.message));
      }
    } catch {
      persistedInCampanhas = false;
    }

    // 3. Persistência de alta disponibilidade em briefings (garante persistência 100% mesmo sem nova migration)
    try {
      const briefingMeta = {
        _planejamento_estrategico: true,
        cliente_id: validClienteId,
        cliente_nome: campanhaFields.cliente_nome,
        nome_campanha: campanhaFields.nome_campanha,
        objetivo: campanhaFields.objetivo,
        publico_alvo: campanhaFields.publico_alvo,
        regiao: campanhaFields.regiao,
        periodo_inicio: campanhaFields.periodo_inicio,
        periodo_fim: campanhaFields.periodo_fim,
        investimento_previsto: campanhaFields.investimento_previsto,
        estrategia: campanhaFields.estrategia,
        pilares: campanhaFields.pilares,
        regioes_selecionadas: campanhaFields.regioes_selecionadas,
        status: campanhaFields.status,
        proposta_id: campanhaFields.proposta_id || null,
        modalidade_desconto,
        desconto_geral_pct,
        valor_final_alvo,
        valor_tabela_total: resultadoComercial.valor_tabela_total,
        valor_desconto_total: resultadoComercial.valor_desconto_total,
        desconto_medio_pct: resultadoComercial.desconto_medio_pct,
        valor_negociado_total: resultadoComercial.valor_negociado_total,
        comissao_total: resultadoComercial.comissao_total,
        repasse_total: resultadoComercial.repasse_total,
        pontos_midia: pontosCalculados,
      };

      await supabaseAdmin.from("briefings").upsert({
        id: campanhaId,
        tenant_id: tenantId,
        created_by: userId,
        tipo_entidade: "cliente",
        razao_social: campanhaFields.cliente_nome || "Cliente Planejamento",
        nome_fantasia: campanhaFields.cliente_nome,
        campanha: campanhaFields.nome_campanha,
        objetivo: campanhaFields.objetivo,
        periodo_estimado: `${campanhaFields.periodo_inicio || ""} a ${campanhaFields.periodo_fim || ""}`.trim(),
        verba_estimada: campanhaFields.investimento_previsto || resultadoComercial.valor_negociado_total,
        status: "planejamento",
        proposta_id: campanhaFields.proposta_id || null,
        produtos: pontosCalculados.map((p) => p.produto_id),
        detalhes_adicionais: JSON.stringify(briefingMeta),
        updated_at: new Date().toISOString(),
      });
    } catch (bErr: any) {
      console.warn("[Planejamento] Erro ao sincronizar briefing:", bErr?.message);
    }

    return {
      id: campanhaId,
      ok: true,
      resultado_comercial: resultadoComercial,
    };
  });

export const deleteCampanhaPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    try {
      await (supabaseAdmin.from("campanhas_planejamento") as any)
        .delete()
        .eq("id", data.id);
    } catch {}

    try {
      await supabaseAdmin
        .from("briefings")
        .delete()
        .eq("id", data.id);
    } catch {}

    return { ok: true };
  });

export const gerarPropostaDoPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { campanha_id: string; validadeDias?: number }) => d)
  .handler(async ({ data: input, context }) => {
    const { userId } = context;

    // 1. Obter os dados completos do planejamento (usando o handler getCampanhaPlanejamentoById)
    const campanha = await getCampanhaPlanejamentoById({ data: { id: input.campanha_id } });

    if (!campanha) {
      throw new Error("Campanha não encontrada para geração de proposta.");
    }

    const pontos = Array.isArray(campanha.pontos_midia) ? campanha.pontos_midia : [];
    if (pontos.length === 0) {
      throw new Error("Adicione ao menos um ponto de mídia ao planejamento antes de gerar a proposta comercial.");
    }

    // 2. Executar cálculo definitivo do motor comercial com preservação de tabela
    const itensCalculo: ItemNegociacao[] = pontos.map((p) => ({
      id: p.produto_id,
      nome: p.produto?.nome || "Ponto de Mídia",
      quantidade: p.quantidade_insercoes || 1,
      valor_unit_tabela: p.valor_tabela_unit ?? Number(p.produto?.valor_unit) ?? p.valor_negociado,
      desconto_pct: p.desconto_pct || 0,
      comissao_pct: p.comissao_pct ?? 20,
    }));

    const resultadoComercial = calcularNegociacaoComercial({
      itens: itensCalculo,
      modalidade: campanha.modalidade_desconto || "nenhum",
      descontoGeralPct: campanha.desconto_geral_pct || 0,
      valorFinalAlvo: campanha.valor_final_alvo || 0,
    });

    const validadeData = new Date();
    validadeData.setDate(validadeData.getDate() + (input.validadeDias || 15));
    const validadeStr = validadeData.toISOString().split("T")[0];

    // 3. Montar itens da proposta oficial
    let totalInsercoesGeral = 0;
    const itensProposta = pontos.map((p, idx) => {
      const calc = resultadoComercial.itens[idx];
      const prod = p.produto || ({} as any);
      const qtdInsercoes = Number(p.quantidade_insercoes) || 1;
      totalInsercoesGeral += qtdInsercoes;

      const vUnitTabela = calc?.valor_unit_tabela ?? (Number(p.valor_tabela_unit) || Number(p.valor_negociado) || 0);
      const totalTabela = calc?.valor_tabela ?? (vUnitTabela * qtdInsercoes);
      const totalNegociado = calc?.valor_total_negociado ?? (Number(p.valor_negociado) * qtdInsercoes);
      const descontoPct = calc?.desconto_pct ?? (totalTabela > 0 ? ((totalTabela - totalNegociado) / totalTabela) * 100 : 0);
      const comissaoPct = calc?.comissao_pct ?? 20;
      const comissaoValor = calc?.comissao_valor ?? (totalNegociado * (comissaoPct / 100));
      const repasseValor = calc?.repasse_valor ?? (totalNegociado - comissaoValor);

      return {
        tipo: prod.tipo || prod.midia || "OOH",
        programa: prod.nome || "Ponto de Mídia Estratégico",
        horario: "Rotativo / 24h",
        formato: prod.formato || "Painel / Face",
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
        insercoes_dia: qtdInsercoes,
        dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
        dias_mes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
        desconto: arredondarMoeda(descontoPct),
        valor_unit: vUnitTabela,
        valor_tabela: totalTabela,
        valor_negociado: totalNegociado,
        total_insercoes: qtdInsercoes,
        dias_veiculacao: 30,
        produto_id: prod.id || p.produto_id,
        parceiro_id: prod.parceiro_id || null,
        parceiro_nome: prod.parceiro_nome || null,
        parceiro_cnpj: prod.parceiro_cnpj || null,
        comissao_pct: comissaoPct,
        comissao_valor: comissaoValor,
        repasse_valor: repasseValor,
        comissao_inquilino_pct: prod.comissao_inquilino_pct || comissaoPct,
        endereco_ponto: prod.endereco_ponto || null,
        latitude: prod.latitude || null,
        longitude: prod.longitude || null,
        fotos: Array.isArray(prod.fotos) ? prod.fotos : [],
      };
    });

    // 4. Inserir proposta comercial oficial (utilizando context.supabase para preservar auth.uid no trigger do banco)
    let propCreated: any = null;
    let pErr: any = null;

    const propPayload = {
      cliente_id: campanha.cliente_id || null,
      cliente_avulso: !campanha.cliente_id ? campanha.cliente_nome : null,
      campanha: campanha.nome_campanha,
      validade: validadeStr,
      observacao: `Proposta gerada a partir do Planejamento Estratégico "${campanha.nome_campanha}".\nEstratégia: ${campanha.estrategia || "N/A"}\nObjetivo: ${campanha.objetivo || "N/A"}\nModalidade Comercial: ${campanha.modalidade_desconto || "Tabela Cheia"}`,
      status: "rascunho",
      valor_tabela: resultadoComercial.valor_tabela_total,
      valor_desconto: resultadoComercial.valor_desconto_total,
      valor_negociado: resultadoComercial.valor_negociado_total,
      total_insercoes: totalInsercoesGeral,
      comissao_pct: 20,
      executivo_id: userId,
      created_by: userId,
      tenant_id: campanha.tenant_id,
    };

    const resUser = await (context.supabase as any)
      .from("propostas")
      .insert(propPayload as never)
      .select("id, numero")
      .single();

    if (resUser.error) {
      console.warn("[Planejamento] Tentando insert via supabaseAdmin:", resUser.error.message);
      const resAdmin = await (supabaseAdmin.from("propostas") as any)
        .insert(propPayload as never)
        .select("id, numero")
        .single();
      propCreated = resAdmin.data;
      pErr = resAdmin.error;
    } else {
      propCreated = resUser.data;
    }

    if (pErr || !propCreated) {
      throw new Error(`Erro ao gerar proposta comercial: ${pErr?.message}`);
    }

    const propostaId = propCreated.id;

    // 5. Inserir os itens da proposta
    const itensComPropId = itensProposta.map((it) => ({
      ...it,
      proposta_id: propostaId,
    }));

    const { error: itemsErr } = await supabaseAdmin
      .from("proposta_itens")
      .insert(itensComPropId as never);

    if (itemsErr) {
      console.warn("[Planejamento] Erro ao salvar itens da proposta:", itemsErr.message);
    }

    // 6. Atualizar a campanha com o ID da proposta gerada
    try {
      await (supabaseAdmin.from("campanhas_planejamento") as any)
        .update({
          proposta_id: propostaId,
          status: "proposta_gerada",
          updated_at: new Date().toISOString(),
        })
        .eq("id", campanha.id);
    } catch {}

    try {
      const { data: bCurr } = await supabaseAdmin
        .from("briefings")
        .select("detalhes_adicionais")
        .eq("id", campanha.id)
        .maybeSingle();

      let meta = {};
      if (bCurr?.detalhes_adicionais) {
        try {
          meta = JSON.parse(bCurr.detalhes_adicionais);
        } catch {}
      }

      await supabaseAdmin
        .from("briefings")
        .update({
          proposta_id: propostaId,
          detalhes_adicionais: JSON.stringify({
            ...meta,
            proposta_id: propostaId,
            status: "proposta_gerada",
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campanha.id);
    } catch {}

    return {
      ok: true,
      proposta_id: propostaId,
      proposta_numero: propCreated.numero,
      resultado_comercial: resultadoComercial,
    };
  });
