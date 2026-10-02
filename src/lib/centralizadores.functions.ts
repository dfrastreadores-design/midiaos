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
    const { supabase, userId } = context;

    try {
      // Obter tenant do usuário
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      const tenantId = prof?.tenant_id;

      // Consultas seguras ao banco de dados com schema real
      let qClientes = supabase.from("clientes").select("id", { count: "exact" });
      let qParceiros = supabase.from("parceiros").select("id", { count: "exact" });
      let qProdutos = supabase.from("produtos").select("id, ativo, valor_unit, parceiro_id", { count: "exact" });
      let qPropostas = supabase.from("propostas").select("id, status, valor_total", { count: "exact" });
      let qPis = supabase.from("pis").select("id, status, valor_negociado", { count: "exact" });
      let qContratos = supabase.from("contratos").select("id, status", { count: "exact" });
      let qTransacoes = supabase.from("financeiro_transacoes").select("id, tipo, status, valor", { count: "exact" });
      let qComprovantes = supabase.from("pos_venda_anexos").select("id", { count: "exact" });

      if (tenantId) {
        qClientes = qClientes.eq("tenant_id", tenantId);
        qParceiros = qParceiros.eq("tenant_id", tenantId);
        qProdutos = qProdutos.eq("tenant_id", tenantId);
        qPropostas = qPropostas.eq("tenant_id", tenantId);
        qPis = qPis.eq("tenant_id", tenantId);
        qContratos = qContratos.eq("tenant_id", tenantId);
        qTransacoes = qTransacoes.eq("tenant_id", tenantId);
      }

      const [
        resClientes,
        resParceiros,
        resProdutos,
        resPropostas,
        resPis,
        resContratos,
        resTransacoes,
        resComprovantes,
      ] = await Promise.all([
        qClientes,
        qParceiros,
        qProdutos,
        qPropostas,
        qPis,
        qContratos,
        qTransacoes,
        qComprovantes,
      ]);

      const clientes = resClientes.data || [];
      const parceiros = resParceiros.data || [];
      const produtos = resProdutos.data || [];
      const propostas = resPropostas.data || [];
      const pis = resPis.data || [];
      const contratos = resContratos.data || [];
      const transacoes = resTransacoes.data || [];
      const comprovantes = resComprovantes.data || [];

      // Métricas financeiras seguras
      const totalEntradasPendentes = (transacoes || [])
        .filter((t: any) => t.tipo === "entrada" && t.status === "pendente")
        .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

      const totalRepassesPendentes = (transacoes || [])
        .filter((t: any) => t.tipo === "saida" && t.status === "pendente")
        .reduce((acc: number, cur: any) => acc + (Number(cur.valor) || 0), 0);

      return {
        funil: {
          clientes: clientes.length,
          parceiros: parceiros.length,
          produtos: produtos.length,
          propostas: propostas.length,
          pis: pis.length,
          contratos: contratos.length,
          comprovantes: comprovantes.length,
        },
        financeiro: {
          aReceber: totalEntradasPendentes,
          aRepassar: totalRepassesPendentes,
        },
      };
    } catch (err) {
      console.warn("Aviso ao carregar painel centralizadores:", err);
      return {
        funil: {
          clientes: 0,
          parceiros: 0,
          produtos: 0,
          propostas: 0,
          pis: 0,
          contratos: 0,
          comprovantes: 0,
        },
        financeiro: {
          aReceber: 0,
          aRepassar: 0,
        },
      };
    }
  });

/**
 * 2. DETECTOR AUTOMÁTICO DE INCONSISTÊNCIAS OPERACIONAIS E FISCAIS (Seção 80)
 */
export const detectarInconsistenciasSistema = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const inconsistencias: InconsistenciaSistema[] = [];

    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      const tenantId = prof?.tenant_id;

      // 1. Produtos sem preço ou sem parceiro
      let qProds = supabase
        .from("produtos")
        .select("id, nome, valor_unit, parceiro_id")
        .eq("ativo", true)
        .limit(50);
      if (tenantId) qProds = qProds.eq("tenant_id", tenantId);
      const { data: prods } = await qProds;

      for (const p of prods || []) {
        if (!p.valor_unit || Number(p.valor_unit) <= 0) {
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

      // 2. PIs em fluxo de assinatura pendente
      let qPis = supabase
        .from("pis")
        .select("id, numero, campanha, status")
        .in("status", ["aguardando_assinatura", "enviar_opec"])
        .limit(30);
      if (tenantId) qPis = qPis.eq("tenant_id", tenantId);
      const { data: pisPendentes } = await qPis;

      for (const pi of pisPendentes || []) {
        inconsistencias.push({
          tipo: "pi_sem_assinatura",
          gravidade: "alta",
          titulo: `PI ${pi.numero || "S/N"} pendente de assinatura`,
          descricao: `A campanha "${pi.campanha}" está aguardando assinatura formal ou liberação OPEC.`,
          entidade_tipo: "pis",
          entidade_id: pi.id,
          link: `/pi?id=${pi.id}`,
        });
      }

      // 3. Contratos ativos sem assinatura
      let qContratos = supabase
        .from("contratos")
        .select("id, numero, titulo, status")
        .eq("status", "aguardando_assinatura")
        .limit(20);
      if (tenantId) qContratos = qContratos.eq("tenant_id", tenantId);
      const { data: contratosPendentes } = await qContratos;

      for (const c of contratosPendentes || []) {
        inconsistencias.push({
          tipo: "contrato_sem_assinatura",
          gravidade: "alta",
          titulo: `Contrato ${c.numero || "S/N"} aguardando assinatura`,
          descricao: `Documento "${c.titulo || "Contrato"}" pendente de coleta de assinaturas.`,
          entidade_tipo: "contratos",
          entidade_id: c.id,
          link: `/contratos?id=${c.id}`,
        });
      }
    } catch (err) {
      console.warn("Aviso ao detectar inconsistências:", err);
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

    // 2. Buscar produtos e parceiros ativos para enriquecer o contexto da IA com o inventário real
    let queryProdutos = supabase
      .from("produtos")
      .select(
        "id, nome, midia, tipo, formato, faixa, valor_unit, duracao_segundos, insercoes_padrao, endereco_ponto, quantidade_telas, parceiro_nome, ativo",
      )
      .or("ativo.eq.true,ativo.is.null");
    if (tenantId) queryProdutos = queryProdutos.eq("tenant_id", tenantId);
    const { data: produtosDb } = await queryProdutos.limit(100);

    const catalogoReal = produtosDb || [];

    // 3. Tentar chamada à IA (Lovable Gateway / Gemini / OpenAI)
    const apiKey =
      process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;

    if (apiKey) {
      try {
        const catalogoSimplificado = catalogoReal.map((p) => ({
          id: p.id,
          nome: p.nome,
          midia: p.midia,
          tipo: p.tipo,
          faixa: p.faixa,
          formato: p.formato,
          preco_unit: p.valor_unit,
          endereco_ponto: p.endereco_ponto,
          parceiro: p.parceiro_nome,
        }));

        const systemPrompt = `Você é o Diretor de Planejamento de Mídia e Inteligência Estratégica do sistema Mídia.OS.
Sua missão é criar uma Estratégia de Mídia de altíssimo nível, convincente, assertiva e customizada para o cliente e cenário fornecidos.
REGRA CRÍTICA: Você DEVE utilizar os produtos e pontos REAIS do inventário do inquilino listados abaixo para compor o plano e preencher o array "itens_inventario".
Cada item alocado em "itens_inventario" deve mapear para um produto_id real do inventário com nome, mídia, valor unitário, quantidade de inserções e justificativa estratégica.
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

INVENTÁRIO REAL DE PRODUTOS E PONTOS DO INQUILINO (OBRIGATÓRIO ALOCAR NESTE PLANO):
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
  "itens_inventario": [
    {
      "produto_id": "string (id exato do produto do inventário)",
      "nome": "string (nome do produto ou tela)",
      "midia": "string (ex: DOOH, TV, Radio)",
      "tipo": "string",
      "formato": "string",
      "parceiro_nome": "string",
      "endereco_ponto": "string",
      "valor_unit": number,
      "insercoes_sugeridas": number,
      "subtotal": number,
      "justificativa": "string (por que este item do inventário foi alocado estrategicamente)"
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
        console.warn(
          "[gerarEstrategiaMidiaIA] Falha na chamada da API de IA, ativando motor heurístico:",
          err,
        );
      }
    }

    // Fallback de alta precisão estratégica utilizando o inventário real
    return montarEstrategiaHeuristicaAvancada(data, catalogoReal);
  });

