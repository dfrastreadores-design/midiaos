import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  calcularRepasseParceiro,
  calcularRateioMultiParceiros,
  executarTesteFinanceiroObrigatorio,
} from "./calculo-financeiro-midia";

export interface BriefingPlanejamento {
  id: string;
  tenant_id?: string;
  cliente_id?: string | null;
  agencia_id?: string | null;
  titulo: string;
  objetivo: string;
  publico_alvo?: string | null;
  pracas?: string[];
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  orcamento_estimado?: number | null;
  formatos_interesse?: string[];
  restricoes?: string | null;
  status: "rascunho" | "em_planejamento" | "proposta_gerada" | "arquivado";
  created_at: string;
  updated_at: string;
  cliente?: { razao_social: string; nome_fantasia: string } | null;
  agencia?: { razao_social: string; nome_fantasia: string } | null;
}

export interface CotacaoParceiro {
  id: string;
  tenant_id?: string;
  briefing_id?: string | null;
  parceiro_id: string;
  produto_id?: string | null;
  quantidade: number;
  periodo_inicio?: string | null;
  periodo_fim?: string | null;
  valor_tabela?: number;
  valor_cotado?: number;
  imposto_estimado_pct?: number;
  comissao_estimada_pct?: number;
  disponibilidade_confirmada?: boolean;
  status: "solicitada" | "respondida" | "selecionada" | "recusada";
  observacoes?: string | null;
  created_at: string;
  parceiro?: { razao_social: string; nome_fantasia: string } | null;
  produto?: { nome: string; formato?: string; praca?: string } | null;
}

export interface InconsistenciaSistema {
  tipo:
    | "produto_sem_preco"
    | "produto_sem_parceiro"
    | "produto_sem_disponibilidade"
    | "campanha_sem_pi"
    | "pi_sem_assinatura"
    | "contrato_sem_assinatura"
    | "campanha_sem_comprovante"
    | "recebimento_sem_campanha"
    | "comissao_divergente";
  gravidade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  entidade_tipo: string;
  entidade_id: string;
  link: string;
}

/**
 * 1. VISÃO GERAL DO FLUXO MASTER DO CENTRALIZADOR (ESTEIRA COMPLETA)
 */
export const getPainelCentralizadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const [
      { data: clientes },
      { data: parceiros },
      { data: produtos },
      { data: propostas },
      { data: pis },
      { data: contratos },
      { data: transacoes },
      { data: comprovantes },
    ] = await Promise.all([
      supabase.from("clientes").select("id, status", { count: "exact" }),
      supabase.from("parceiros").select("id, status", { count: "exact" }),
      supabase.from("produtos").select("id, status, preco, parceiro_id", { count: "exact" }),
      supabase.from("propostas").select("id, status, valor_total", { count: "exact" }),
      supabase.from("pis").select("id, status, valor_bruto, valor_liquido", { count: "exact" }),
      supabase.from("contratos").select("id, status, valor", { count: "exact" }),
      supabase.from("transacoes_financeiras").select("id, tipo, status, valor", { count: "exact" }),
      supabase.from("comprovantes_execucao").select("id, validado", { count: "exact" }),
    ]);

    // Métricas agregadas do funil
    const totalClientes = clientes?.length || 0;
    const totalParceiros = parceiros?.length || 0;
    const totalProdutos = produtos?.length || 0;
    const totalPropostas = propostas?.length || 0;
    const totalPis = pis?.length || 0;
    const totalContratos = contratos?.length || 0;
    const totalComprovantes = comprovantes?.length || 0;

    // Métricas financeiras
    const totalEntradasPendentes = (transacoes || [])
      .filter((t) => t.tipo === "entrada" && t.status === "pendente")
      .reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

    const totalRepassesPendentes = (transacoes || [])
      .filter((t) => t.tipo === "saida" && t.status === "pendente")
      .reduce((acc, cur) => acc + (Number(cur.valor) || 0), 0);

    return {
      funil: {
        clientes: totalClientes,
        parceiros: totalParceiros,
        produtos: totalProdutos,
        propostas: totalPropostas,
        pis: totalPis,
        contratos: totalContratos,
        comprovantes: totalComprovantes,
      },
      financeiro: {
        aReceber: totalEntradasPendentes,
        aRepassar: totalRepassesPendentes,
      },
    };
  });

/**
 * 2. DETECTOR AUTOMÁTICO DE INCONSISTÊNCIAS OPERACIONAIS E FISCAIS (Seção 80)
 */
export const detectarInconsistenciasSistema = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const inconsistencias: InconsistenciaSistema[] = [];

    // 1. Produtos sem preço ou sem parceiro
    const { data: prods } = await supabase
      .from("produtos")
      .select("id, nome, preco, parceiro_id")
      .eq("status", "ativo")
      .limit(50);

    for (const p of prods || []) {
      if (!p.preco || Number(p.preco) <= 0) {
        inconsistencias.push({
          tipo: "produto_sem_preco",
          gravidade: "alta",
          titulo: `Produto sem preço de tabela: "${p.nome}"`,
          descricao: "O produto está ativo no catálogo mas não possui valor parametrizado.",
          entidade_tipo: "produtos",
          entidade_id: p.id,
          link: `/produtos?id=${p.id}`,
        });
      }
      if (!p.parceiro_id) {
        inconsistencias.push({
          tipo: "produto_sem_parceiro",
          gravidade: "media",
          titulo: `Produto sem parceiro vinculado: "${p.nome}"`,
          descricao: "Produto comercializado sem identificar o veículo de mídia responsável.",
          entidade_tipo: "produtos",
          entidade_id: p.id,
          link: `/produtos?id=${p.id}`,
        });
      }
    }

    // 2. PIs aprovados sem documento de assinatura
    const { data: pisPendentes } = await supabase
      .from("pis")
      .select("id, numero, campanha, status, status_assinatura")
      .in("status", ["aguardando_assinatura", "enviar_opec"])
      .limit(30);

    for (const pi of pisPendentes || []) {
      if (!pi.status_assinatura || pi.status_assinatura === "aguardando_definicao") {
        inconsistencias.push({
          tipo: "pi_sem_assinatura",
          gravidade: "alta",
          titulo: `PI ${pi.numero} sem fluxo de assinatura concluído`,
          descricao: `A campanha "${pi.campanha}" está aguardando assinatura formal ou liberação OPEC.`,
          entidade_tipo: "pis",
          entidade_id: pi.id,
          link: `/pi?id=${pi.id}`,
        });
      }
    }

    // 3. Contratos ativos sem assinatura
    const { data: contratosPendentes } = await supabase
      .from("contratos")
      .select("id, numero, titulo, status")
      .eq("status", "aguardando_assinatura")
      .limit(20);

    for (const c of contratosPendentes || []) {
      inconsistencias.push({
        tipo: "contrato_sem_assinatura",
        gravidade: "alta",
        titulo: `Contrato ${c.numero} aguardando assinatura`,
        descricao: `Documento "${c.titulo}" pendente de coleta digital ou manual de assinaturas.`,
        entidade_tipo: "contratos",
        entidade_id: c.id,
        link: `/contratos?id=${c.id}`,
      });
    }

    return inconsistencias;
  });

/**
 * 3. EXECUÇÃO DO TESTE FINANCEIRO FORMAL (Seção 83)
 */
export const validarRegrasCalculoFinanceiro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return executarTesteFinanceiroObrigatorio();
  });

/**
 * 4. INTELIGÊNCIA ARTIFICIAL ESTRATÉGICA DE MÍDIA (Planejador por Cliente & Cenário)
 */
export {
  EstrategiaMidiaInputSchema,
  type EstrategiaMidiaInput,
  type CanalMixRecomendado,
  type FaseCronograma,
  type MetricasProjetadas,
  type EstrategiaMidiaOutput,
  montarEstrategiaHeuristicaAvancada,
} from "./estrategia-midia-ia";
import {
  EstrategiaMidiaInputSchema,
  type EstrategiaMidiaOutput,
  montarEstrategiaHeuristicaAvancada,
} from "./estrategia-midia-ia";

export const gerarEstrategiaMidiaIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => EstrategiaMidiaInputSchema.parse(d))
  .handler(async ({ data, context }): Promise<EstrategiaMidiaOutput> => {
    const { supabase, userId } = context;

    // 1. Obter tenant do usuário logado
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();
    const tenantId = prof?.tenant_id;

    // 2. Buscar produtos e parceiros ativos para enriquecer o contexto da IA
    let queryProdutos = supabase
      .from("produtos")
      .select("id, nome, midia, tipo, formato, faixa, preco, valor_unit")
      .eq("status", "ativo");
    if (tenantId) queryProdutos = queryProdutos.eq("tenant_id", tenantId);
    const { data: produtosDb } = await queryProdutos.limit(20);

    // 3. Tentar chamada à IA (Lovable Gateway / Gemini / OpenAI)
    const apiKey =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const catalogoSimplificado = (produtosDb || []).map((p) => ({
          nome: p.nome,
          midia: p.midia,
          tipo: p.tipo,
          faixa: p.faixa,
          formato: p.formato,
          preco: p.valor_unit || p.preco,
        }));

        const systemPrompt = `Você é o Diretor de Planejamento de Mídia e Inteligência Estratégica do sistema Mídia.OS.
Sua missão é criar uma Estratégia de Mídia de altíssimo nível, convincente, assertiva e customizada para o cliente e cenário fornecidos.
Considere as particularidades de cada veículo (TV, Rádio, DOOH/Painéis, Portais e Digital), proponha um mix percentual equilibrado que totalize 100%, 
cronograma em fases, métricas estimadas (alcance, impactos, frequência) e argumentos matadores para que o executivo de contas apresente ao decisor do cliente.
Retorne SEMPRE um JSON válido estritamente no formato solicitado.`;

        const userPrompt = `DADOS DO CLIENTE E CENÁRIO ESTRATÉGICO:
- Cliente: ${data.cliente_nome}
- Segmento: ${data.segmento}
- Cenário Atual: ${data.cenario_atual}
- Objetivo Principal da Campanha: ${data.objetivo_principal}
- Público-Alvo: ${data.publico_alvo}
- Praças de Interesse: ${data.pracas.join(", ")}
- Orçamento Disponível (Budget): R$ ${data.budget_estimado}
- Duração da Campanha: ${data.duracao_dias} dias
- Mídias Preferenciais: ${data.veiculos_preferenciais.join(", ")}
- Diferenciais do Cliente: ${data.diferenciais_cliente || "Qualidade e atendimento"}
- Tom de Comunicação: ${data.tom_comunicacao}

PRODUTOS / FORMATOS DO CATÁLOGO DO TENANT (REFERÊNCIA):
${JSON.stringify(catalogoSimplificado, null, 2)}

FORMATO DE RESPOSTA OBRIGATÓRIO (JSON):
{
  "titulo_estrategia": "string (ex: Estratégia Cross-Media: Nome do Cliente — Foco em Conversão)",
  "diagnostico_cenario": "string (diagnóstico do cenário do cliente e por que o momento exige este plano)",
  "racional_estrategico": "string (lógica tática da conexão dos veículos no funil de compra)",
  "mix_recomendado": [
    {
      "canal": "string (nome do veículo/mídia)",
      "percentual": number (ex: 40),
      "valor_alocado": number (calculado sobre o budget de R$ ${data.budget_estimado}),
      "papel_tatico": "string (papel desse canal no plano)",
      "frequencia_sugerida": "string (ex: 3 inserções/dia)",
      "formatos_indicados": ["string", "string"]
    }
  ],
  "cronograma_fases": [
    {
      "fase": "string (ex: Fase 1: Ignição)",
      "periodo": "string (ex: Dias 1 a 10)",
      "foco": "string",
      "canais_ativos": ["string"],
      "detalhe_operacional": "string"
    }
  ],
  "metricas_projetadas": {
    "alcance_estimado": "string (ex: 850.000 pessoas únicas)",
    "impactos_totais": "string (ex: 2.800.000 impactos)",
    "frequencia_media": "string (ex: 3.3x)",
    "cpm_estimado": "string (ex: R$ 17,85)",
    "justificativa_roi": "string"
  },
  "argumentos_venda_decisor": [
    "string com argumento 1",
    "string com argumento 2",
    "string com argumento 3",
    "string com argumento 4"
  ],
  "acoes_diferenciais": [
    "string com ação criativa 1",
    "string com ação criativa 2"
  ],
  "observacoes_veiculacao": "string"
}`;

        const isLovable = !process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY;
        const endpoint = isLovable
          ? "https://ai.gateway.lovable.dev/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";

        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (
              parsed.titulo_estrategia &&
              Array.isArray(parsed.mix_recomendado) &&
              parsed.mix_recomendado.length > 0
            ) {
              return parsed as EstrategiaMidiaOutput;
            }
          }
        }
      } catch (err) {
        console.warn("[gerarEstrategiaMidiaIA] Falha na chamada da API de IA, ativando motor heurístico:", err);
      }
    }

    // Fallback de alta precisão estratégica
    return montarEstrategiaHeuristicaAvancada(data, produtosDb || []);
  });

