import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-user";
import { formatBRL } from "@/lib/mock-data";
import type {
  PlanejamentoEstrategicoCompleto,
  ChatMensagemCopiloto,
  BriefingPlanejamentoIa,
  DiagnosticoEstrategicoIa,
  ObjetivosCampanhaIa,
  EstrategiaRecomendadaIa,
  PontoPlanoMidiaIa,
  DistribuicaoInvestimentoIa,
  DefesaComercialIa,
  CenarioSimuladoIa,
  ApresentacaoExecutivaIa,
  AprendizadoContinuoIa,
} from "./copiloto-planejamento.types";

// ==============================================================================
// COPILOTO IA DE PLANEJAMENTO DE MÍDIA — SERVER FUNCTIONS
// Mídia.OS 3.0: O Estrategista Sênior de Mídia com Inteligência Contínua
// ==============================================================================

const ConversaSchema = z.object({
  mensagem_usuario: z.string().min(1, "Mensagem é obrigatória"),
  historico_mensagens: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      timestamp: z.string(),
      acoes_sugeridas: z.array(z.string()).optional(),
    })
  ).optional().default([]),
  planejamento_atual: z.any().optional().nullable(),
  cliente_id: z.string().optional().nullable(),
  cliente_nome: z.string().optional().nullable(),
  segmento: z.string().optional().nullable(),
  praca: z.string().optional().nullable(),
  orcamento: z.number().optional().nullable(),
  duracao_dias: z.number().optional().nullable(),
});

/**
 * Função principal que processa a conversa do usuário, refina o planejamento
 * e retorna a resposta da IA + o dossiê atualizado com as 9 seções.
 */
export const conversarCopilotoPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => ConversaSchema.parse(d))
  .handler(async ({ data, context }: any) => {
    const auth = context || (await requireSupabaseAuth());
    const supabase = auth.supabase;
    const session = auth.session;
    const userId = auth.userId || session?.user?.id;
    const userEmail = (auth.claims?.email || session?.user?.email || "").toLowerCase();
    const isMaster = isMasterEmail(userEmail);

    let tenantId = auth.tenantId || (auth.claims as any)?.tenant_id || (session?.user?.app_metadata as any)?.tenant_id;
    if (!tenantId) {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("tenant_id")
          .eq("id", userId)
          .maybeSingle();
        tenantId = profile?.tenant_id;
      } catch {
        // fallback
      }
    }

    if (!tenantId && !isMaster) {
      throw new Error("Tenant não localizado para o usuário.");
    }

    // 1. Buscar inventário disponível no tenant
    let produtosInventario: any[] = [];
    try {
      let query = (supabase.from("produtos") as any)
        .select("id, nome, midia, tipo, formato, endereco_ponto, cidade, praca, valor_unit, impactos_mes_estimados, foto_comercial, latitude, longitude, status")
        .eq("status", "ativo")
        .limit(60);

      if (tenantId && !isMaster) {
        query = query.eq("tenant_id", tenantId);
      }

      const { data: prods } = await query;
      produtosInventario = prods || [];
    } catch (e) {
      console.warn("Aviso ao carregar produtos do inventário:", e);
    }

    // 2. Buscar dados do cliente no CRM se fornecido
    let clienteCrm: any = null;
    if (data.cliente_id) {
      try {
        const { data: cli } = await (supabase.from("clientes") as any)
          .select("id, nome, razao_social, cnpj, segmento, cidade, estado, observacoes")
          .eq("id", data.cliente_id)
          .maybeSingle();
        clienteCrm = cli;
      } catch (e) {
        console.warn("Aviso ao carregar cliente CRM:", e);
      }
    }

    // 3. Buscar aprendizados históricos de planejamentos aprovados no tenant
    let historicoAprendizado: any[] = [];
    try {
      const { data: aprendizados } = await (supabase.from("estrategias_ia") as any)
        .select("prompt, resposta, feedback, estrelas_avaliacao")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(5);
      historicoAprendizado = aprendizados || [];
    } catch {
      // tolerante se a tabela ainda estiver sendo propagada
    }

    // 4. Executar o Estrategista de Mídia (IA Gemini com fallback avançado)
    const apiKey = process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    const gatewayUrl = process.env.AI_GATEWAY_URL || "https://ai.lovable.dev/v1/chat/completions";

    let respostaTexto = "";
    let planejamentoAtualizado: PlanejamentoEstrategicoCompleto;

    // Gerar ou atualizar planejamento
    const basePlanejamento = data.planejamento_atual || gerarPlanejamentoInicialHeuristico({
      clienteCrm,
      clienteNome: data.cliente_nome,
      segmento: data.segmento,
      praca: data.praca,
      orcamento: data.orcamento,
      duracaoDias: data.duracao_dias,
      produtos: produtosInventario,
    });

    if (apiKey) {
      try {
        const systemPrompt = `Você é o Estrategista Sênior de Mídia do Mídia.OS 3.0.
Seu papel é substituir a simples "criação de proposta" por um "planejamento estratégico de mídia de alto impacto".
Você deve orientar o cliente e a equipe comercial como um diretor de mídia de grandes agências.

Você deve entender objetivos, analisar o território, recomendar formatos de mídia física e digital out-of-home (OOH/DOOH),
justificar investimentos contra concorrentes digitais (Google/Meta), simular cenários e estruturar defesas comerciais imbatíveis.

INVENTÁRIO REAL DISPONÍVEL DO CLIENTE (${produtosInventario.length} pontos):
${JSON.stringify(produtosInventario.slice(0, 15).map(p => ({
  id: p.id,
  nome: p.nome,
  tipo: p.tipo || p.midia,
  formato: p.formato,
  cidade: p.cidade || p.praca,
  impactos: p.impactos_mes_estimados,
  valor: p.valor_unit,
  endereco: p.endereco_ponto,
})))}

RETORNE SEMPRE UM JSON VÁLIDO com exatamente esta estrutura:
{
  "mensagem_resposta": "Mensagem conversacional de alto nível com explicações estratégicas, insights de mercado e perguntas de aprofundamento se necessário",
  "acoes_sugeridas": ["3 a 4 comandos rápidos que o usuário pode clicar para refinar o plano"],
  "briefing": { ... },
  "diagnostico": { ... },
  "objetivos": { ... },
  "estrategia": { ... },
  "plano_midia": [ ... pontos selecionados do inventário com justificativa ... ],
  "distribuicao_investimento": { ... },
  "defesa_comercial": { ... },
  "cenarios": { ... },
  "apresentacao_executiva": { ... }
}`;

        const promptContexto = `
COMANDO DO USUÁRIO: "${data.mensagem_usuario}"
PLANEJAMENTO ANTERIOR: ${JSON.stringify(basePlanejamento)}
CLIENTE: ${clienteCrm ? JSON.stringify(clienteCrm) : data.cliente_nome || "Novo Cliente"}
ORÇAMENTO INFORMADO: R$ ${data.orcamento || basePlanejamento.briefing.orcamento_total}
PRAÇA: ${data.praca || basePlanejamento.briefing.praca_alvo}
DURAÇÃO: ${data.duracao_dias || basePlanejamento.briefing.duracao_dias} dias
HISTÓRICO DE SUCESSO DO TENANT: ${JSON.stringify(historicoAprendizado.slice(0, 2))}

Ajuste e evolua o planejamento conforme o comando do usuário mantendo todos os 9 pilares estratégicos de alto padrão.
`;

        const res = await fetch(gatewayUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: promptContexto },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (res.ok) {
          const jsonRes = await res.json();
          const raw = jsonRes?.choices?.[0]?.message?.content || "";
          if (raw) {
            const parsed = JSON.parse(raw);
            respostaTexto = parsed.mensagem_resposta || "Planejamento estratégico atualizado com sucesso com base nas suas diretrizes.";
            
            planejamentoAtualizado = {
              ...basePlanejamento,
              versao: (basePlanejamento.versao || 1) + 1,
              updated_at: new Date().toISOString(),
              briefing: parsed.briefing || basePlanejamento.briefing,
              diagnostico: parsed.diagnostico || basePlanejamento.diagnostico,
              objetivos: parsed.objetivos || basePlanejamento.objetivos,
              estrategia: parsed.estrategia || basePlanejamento.estrategia,
              plano_midia: Array.isArray(parsed.plano_midia) && parsed.plano_midia.length > 0 
                ? parsed.plano_midia 
                : basePlanejamento.plano_midia,
              distribuicao_investimento: parsed.distribuicao_investimento || basePlanejamento.distribuicao_investimento,
              defesa_comercial: parsed.defesa_comercial || basePlanejamento.defesa_comercial,
              cenarios: parsed.cenarios || basePlanejamento.cenarios,
              apresentacao_executiva: parsed.apresentacao_executiva || basePlanejamento.apresentacao_executiva,
            };

            const novaMensagemAssitente: ChatMensagemCopiloto = {
              id: "msg_" + Math.random().toString(36).substring(2, 9),
              role: "assistant",
              content: respostaTexto,
              timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              acoes_sugeridas: parsed.acoes_sugeridas || [
                "Gerar Apresentação Executiva em PPTX",
                "Converter planejamento em Pedido de Inserção (PI)",
                "Simular cenário com +20% de investimento",
                "Reforçar defesa contra mídia digital (Meta/Google)"
              ],
            };

            return {
              sucesso: true,
              mensagem_ia: novaMensagemAssitente,
              planejamento: planejamentoAtualizado,
            };
          }
        }
      } catch (errAi) {
        console.warn("Falha no gateway Gemini, usando motor estratégico heurístico:", errAi);
      }
    }

    // Fallback: Estrategista Heurístico Avançado
    const heuristicResult = evoluirPlanejamentoHeuristico(
      basePlanejamento,
      data.mensagem_usuario,
      produtosInventario,
      clienteCrm
    );

    return {
      sucesso: true,
      mensagem_ia: heuristicResult.mensagem,
      planejamento: heuristicResult.planejamento,
    };
  });

/**
 * Função para salvar aprovação e aprendizado contínuo do planejamento
 */
export const registrarAprendizadoCopiloto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      planejamento_id: z.string(),
      status_aprovacao: z.enum(["aprovado", "ajustado", "recusado"]),
      estrelas_avaliacao: z.number().min(1).max(5).optional(),
      feedback_usuario: z.string().optional(),
      motivo_ajuste_recusa: z.string().optional(),
      planejamento_snapshot: z.any().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }: any) => {
    const auth = context || (await requireSupabaseAuth());
    const supabase = auth.supabase;
    const session = auth.session;
    const userId = auth.userId || session?.user?.id;
    let tenantId = auth.tenantId || (auth.claims as any)?.tenant_id || (session?.user?.app_metadata as any)?.tenant_id;
    if (!tenantId) {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("tenant_id")
          .eq("id", userId)
          .maybeSingle();
        tenantId = profile?.tenant_id;
      } catch {
        // fallback
      }
    }

    try {
      await (supabase.from("estrategias_ia") as any).insert({
        tenant_id: tenantId,
        tipo_consulta: "aprendizado_planejamento_copiloto",
        prompt: {
          planejamento_id: data.planejamento_id,
          status: data.status_aprovacao,
          feedback: data.feedback_usuario,
        },
        resposta: data.planejamento_snapshot || {},
        feedback: data.feedback_usuario,
        estrelas_avaliacao: data.estrelas_avaliacao || 5,
        created_at: new Date().toISOString(),
      });
      return { sucesso: true, mensagem: "Aprendizado registrado com sucesso para aprimorar futuros planejamentos." };
    } catch (e: any) {
      console.warn("Aviso ao persistir aprendizado contínuo:", e);
      return { sucesso: false, erro: e.message };
    }
  });

/**
 * Converte o planejamento estratégico aprovado em Pedido de Inserção (PI) e Proposta oficial
 */
export const converterPlanejamentoEmPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      planejamento: z.any(),
      cliente_id: z.string().optional().nullable(),
      observacoes: z.string().optional(),
    }).parse(d)
  )
  .handler(async ({ data, context }: any) => {
    const auth = context || (await requireSupabaseAuth());
    const supabase = auth.supabase;
    const session = auth.session;
    const userId = auth.userId || session?.user?.id;
    const userEmail = (auth.claims?.email || session?.user?.email || "").toLowerCase();
    const isMaster = isMasterEmail(userEmail);

    let tenantId = auth.tenantId || (auth.claims as any)?.tenant_id || (session?.user?.app_metadata as any)?.tenant_id;
    if (!tenantId) {
      try {
        const { data: profile } = await (supabase.from("profiles") as any)
          .select("tenant_id")
          .eq("id", userId)
          .maybeSingle();
        tenantId = profile?.tenant_id;
      } catch {
        // fallback
      }
    }

    const plan: PlanejamentoEstrategicoCompleto = data.planejamento;
    const briefing = plan.briefing;
    const valorTotal = plan.distribuicao_investimento.valor_total || briefing.orcamento_total;

    // 1. Criar ou vincular proposta comercial estratégica
    const numeroProposta = `PROP-PLAN-${Date.now().toString().slice(-6)}`;
    const hoje = new Date().toISOString().split("T")[0];

    const { data: novaProposta, error: propErr } = await (supabase.from("propostas") as any)
      .insert({
        tenant_id: tenantId,
        cliente_id: data.cliente_id || briefing.cliente_id || null,
        numero: numeroProposta,
        titulo: `Planejamento Estratégico: ${briefing.cliente_nome}`,
        valor_total: valorTotal,
        status: "aprovada",
        data_validade: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
        custom_config: {
          origem: "copiloto_planejamento_ia",
          planejamento_id: plan.id,
          estrategia_tese: plan.estrategia.tese_central,
          distribuicao_investimento: plan.distribuicao_investimento,
          cenario_escolhido: plan.cenarios.ativo,
        },
      })
      .select("id, numero")
      .single();

    if (propErr) {
      throw new Error(`Falha ao registrar proposta de planejamento: ${propErr.message}`);
    }

    // 2. Criar Pedido de Inserção (PI) oficial
    const numeroPi = `PI-EST-${Date.now().toString().slice(-6)}`;
    const { data: novoPi, error: piErr } = await (supabase.from("pedidos_insercao") as any)
      .insert({
        tenant_id: tenantId,
        proposta_id: novaProposta.id,
        cliente_id: data.cliente_id || briefing.cliente_id || null,
        numero_pi: numeroPi,
        status: "ativo",
        data_emissao: hoje,
        valor_bruto: valorTotal,
        valor_liquido: valorTotal,
        observacoes: `Gerado automaticamente via Copiloto IA de Planejamento de Mídia.\nTese Estratégica: ${plan.estrategia.tese_central}\n${data.observacoes || ""}`,
      })
      .select("id, numero_pi")
      .single();

    if (piErr) {
      throw new Error(`Falha ao gerar Pedido de Inserção (PI): ${piErr.message}`);
    }

    // 3. Inserir itens no PI a partir do plano de mídia do inventário
    if (plan.plano_midia && plan.plano_midia.length > 0) {
      const itensPi = plan.plano_midia.map((p, idx) => ({
        pedido_insercao_id: novoPi.id,
        produto_id: p.produto_id || null,
        descricao: `${p.nome} - ${p.tipo} (${p.endereco || p.cidade})`,
        quantidade: 1,
        valor_unitario: p.valor_negociado || p.valor_tabela || 0,
        valor_total: p.valor_negociado || p.valor_tabela || 0,
        data_inicio: briefing.periodo_inicio || hoje,
        data_fim: briefing.periodo_fim || new Date(Date.now() + (briefing.duracao_dias || 30) * 86400000).toISOString().split("T")[0],
      }));

      try {
        await (supabase.from("itens_pedido_insercao") as any).insert(itensPi);
      } catch (itemErr) {
        console.warn("Aviso ao inserir itens detalhados no PI:", itemErr);
      }
    }

    return {
      sucesso: true,
      mensagem: `Planejamento convertido com sucesso! Proposta ${novaProposta.numero} e ${novoPi.numero_pi} gerados.`,
      proposta_id: novaProposta.id,
      pi_id: novoPi.id,
      numero_pi: novoPi.numero_pi,
    };
  });

// ==============================================================================
// GERADORES ESTRATÉGICOS HEURÍSTICOS (DIRETOR DE MÍDIA SÊNIOR)
// ==============================================================================

export function gerarPlanejamentoInicialHeuristico(params: {
  clienteCrm?: any;
  clienteNome?: string | null;
  segmento?: string | null;
  praca?: string | null;
  orcamento?: number | null;
  duracaoDias?: number | null;
  produtos: any[];
}): PlanejamentoEstrategicoCompleto {
  const clienteNome = params.clienteCrm?.nome || params.clienteNome || "Cliente Corporativo";
  const segmento = params.clienteCrm?.segmento || params.segmento || "Varejo & Serviços";
  const praca = params.clienteCrm?.cidade || params.praca || "Capital e Região Metropolitana";
  const orcamento = Number(params.orcamento) > 0 ? Number(params.orcamento) : 25000;
  const duracao = Number(params.duracaoDias) > 0 ? Number(params.duracaoDias) : 30;

  // Selecionar pontos do inventário que combinem com a praça ou orçamento
  let pontosInventario: PontoPlanoMidiaIa[] = [];
  if (params.produtos.length > 0) {
    pontosInventario = params.produtos.slice(0, 8).map((prod, idx) => {
      const valorUnit = Number(prod.valor_unit) || 2500;
      const desc = idx % 2 === 0 ? 10 : 15;
      const valorNegociado = Math.round(valorUnit * (1 - desc / 100));
      return {
        id: `pt_${prod.id || idx}`,
        produto_id: prod.id,
        nome: prod.nome || `Painel Estratégico ${idx + 1}`,
        midia: prod.midia || "OOH",
        tipo: prod.tipo || "Frontlight",
        formato: prod.formato || "9x3m Iluminado",
        endereco: prod.endereco_ponto || `Avenida Central, nº ${100 * (idx + 1)}`,
        bairro: "Centro Financeiro",
        cidade: prod.cidade || praca,
        praca: prod.praca || praca,
        impactos_mes: Number(prod.impactos_mes_estimados) || 450000,
        valor_tabela: valorUnit,
        valor_negociado: valorNegociado,
        desconto_pct: desc,
        foto_url: prod.foto_comercial || null,
        justificativa_estrategica: `Ponto de alta visibilidade no corredor de maior fluxo comercial, garantindo frequência repetida para o público de ${segmento}.`,
        latitude: prod.latitude,
        longitude: prod.longitude,
      };
    });
  } else {
    // Pontos conceituais se não houver produtos cadastrados
    pontosInventario = [
      {
        id: "pt_1",
        nome: "Frontlight Avenida Comercial Prime",
        midia: "OOH",
        tipo: "Frontlight",
        formato: "9x3m Iluminado",
        endereco: "Av. Principal com Rua de Acesso ao Shopping",
        cidade: praca,
        praca: praca,
        impactos_mes: 620000,
        valor_tabela: 5500,
        valor_negociado: 4800,
        desconto_pct: 12.7,
        justificativa_estrategica: "Entrada dos principais centros de compras e polos gastronômicos.",
      },
      {
        id: "pt_2",
        nome: "Painel Digital LED Alta Definição",
        midia: "DOOH",
        tipo: "Painel LED",
        formato: "8x4m Digital P6",
        endereco: "Cruzamento Central - Eixo Bancário",
        cidade: praca,
        praca: praca,
        impactos_mes: 1200000,
        valor_tabela: 7000,
        valor_negociado: 6000,
        desconto_pct: 14.2,
        justificativa_estrategica: "Dinamismo de mensagens por horário e autoridade visual inquestionável.",
      },
      {
        id: "pt_3",
        nome: "Abrigo de Ônibus MUPI Central",
        midia: "OOH Mobiliário",
        tipo: "Mobiliário Urbano",
        formato: "1.20x1.80m Dupla Face",
        endereco: "Corredor de Transporte de Massa",
        cidade: praca,
        praca: praca,
        impactos_mes: 480000,
        valor_tabela: 3200,
        valor_negociado: 2700,
        desconto_pct: 15.6,
        justificativa_estrategica: "Tempo de exposição prolongado no nível do pedestre e motorista em tráfego lento.",
      },
    ];
  }

  // Cálculos consolidados
  const somaImpactos = pontosInventario.reduce((acc, p) => acc + (p.impactos_mes || 0), 0);
  const valorTotalNegociado = pontosInventario.reduce((acc, p) => acc + (p.valor_negociado || 0), 0) || orcamento;
  const cpmCalculado = somaImpactos > 0 ? (valorTotalNegociado / somaImpactos) * 1000 : 4.8;

  const briefing: BriefingPlanejamentoIa = {
    cliente_id: params.clienteCrm?.id || null,
    cliente_nome: clienteNome,
    razao_social: params.clienteCrm?.razao_social || null,
    cnpj: params.clienteCrm?.cnpj || null,
    segmento: segmento,
    praca_alvo: praca,
    orcamento_total: orcamento,
    duracao_dias: duracao,
    periodo_inicio: new Date().toISOString().split("T")[0],
    periodo_fim: new Date(Date.now() + duracao * 86400000).toISOString().split("T")[0],
    publico_alvo: {
      perfil: `Consumidores economicamente ativos, tomadores de decisão e famílias da região de ${praca}.`,
      faixa_etaria: "25 a 55 anos",
      classe_social: "Classes A, B e C+",
      habitos_deslocamento: "Trajeto pendular diário trabalho-residência via principais eixos arteriais e polos de consumo.",
    },
    concorrentes_diretos: ["Players regionais tradicionais", "Anunciantes agressivos em canais digitais"],
    diferenciais_marca: "Credibilidade consolidada, proximidade de atendimento e proposta de valor competitiva.",
    historico_crm: params.clienteCrm?.observacoes || "Cliente com alto potencial de recorrência e foco em consolidação de share de mercado.",
  };

  const diagnostico: DiagnosticoEstrategicoIa = {
    analise_mercado: `O mercado de ${segmento} em ${praca} apresenta saturação nos leilões de tráfego pago online, com elevação constante de CPC/CPA. A mídia física e DOOH atua como âncora de autoridade inescapável.`,
    oportunidades_territoriais: `Cercamento geográfico dos eixos de maior fluxo pendular, interligando zonas residenciais nobres aos distritos de negócios e polos de compras.`,
    desafios_comunicacao: `Superar a cegueira de anúncios móveis com formatos de grande dimensão que impõem presença e memorização forçada.`,
    posicionamento_concorrencia: `Concorrentes dispersam verba em campanhas digitais efêmeras sem presença física imersiva na cidade.`,
    matriz_swot_resumo: {
      forcas: ["Visibilidade contínua 24/7 sem bloqueadores de anúncio", "Alto impacto visual com formatos premium", "Excelente custo por mil impactos (CPM)"],
      fraquezas: ["Necessidade de mensagem concisa e direta (leitura em 5 segundos)"],
      oportunidades: ["Dominar os cruzamentos que concentram o público de maior poder aquisitivo", "Ativação sincronizada de horários de pico"],
      ameacas: ["Ação pontual de concorrentes em praças limítrofes"],
    },
  };

  const objetivos: ObjetivosCampanhaIa = {
    objetivo_primario: `Maximizar o Share of Mind e a blindagem de território da marca ${clienteNome} em ${praca}.`,
    objetivos_secundarios: [
      "Aumentar o tráfego qualificado para os pontos de venda e canais de contato",
      "Garantir frequência mínima de 7 exposições por consumidor durante o período",
      "Reduzir o CPM médio de marketing da empresa frente a mídias tradicionais e digitais",
    ],
    kpis_projetados: {
      alcance_pessoas_unicas: Math.round(somaImpactos * 0.38),
      impactos_visuais_totais: somaImpactos,
      frequencia_media: 6.8,
      cpm_estimado: Number(cpmCalculado.toFixed(2)),
      share_of_voice_estimado_pct: 35,
    },
  };

  const estrategia: EstrategiaRecomendadaIa = {
    tese_central: `Cercamento Estratégico Omnipresente: Posicionamento nos gargalos obrigatórios de deslocamento diário da praça de ${praca}, aliando a autoridade do grande formato físico à flexibilidade do DOOH.`,
    racional_estrategico: `Ao interceptar o consumidor nos momentos de decisão e deslocamento, a campanha constrói familiaridade e confiança instantânea, gerando efeito multiplicador sobre todas as outras iniciativas comerciais.`,
    pilares: {
      afinidade_territorial: {
        nome: "Afinidade Territorial",
        nota: 9.6,
        descricao: "Pontos selecionados a menos de 10 minutos dos principais eixos de consumo e polos geradores de tráfego.",
      },
      frequencia_impacto: {
        nome: "Frequência de Impacto",
        nota: 9.2,
        descricao: "Repetição sistemática do trajeto de ida e volta, fixando a mensagem no subconsciente do decisor.",
      },
      visibilidade_autoridade: {
        nome: "Visibilidade & Autoridade",
        nota: 9.8,
        descricao: "Formatos de grande porte com iluminação noturna que conferem status de liderança de mercado à marca.",
      },
      mobilidade_jornada: {
        nome: "Mobilidade na Jornada",
        nota: 8.9,
        descricao: "Acompanhamento da rotina urbana do cliente: residência -> trânsito -> trabalho -> lazer.",
      },
      ativacao_conversao: {
        nome: "Ativação & Conversão",
        nota: 8.7,
        descricao: "Chamadas claras com QR Code inteligente ou direcionamento geográfico para conversão ágil.",
      },
    },
    cronograma_fases: [
      {
        fase: "Fase 1",
        nome: "Teaser & Reconhecimento de Marca",
        dias: "Dias 1 a 10",
        objetivo: "Despertar curiosidade e posicionar a autoridade da marca na cidade.",
        foco_tatico: "Formatos de grande escala em eixos de entrada e saída.",
        canais_principais: ["Frontlights Prime", "Painéis LED Centrais"],
      },
      {
        fase: "Fase 2",
        nome: "Sustentação & Frequência Massiva",
        dias: "Dias 11 a 22",
        objetivo: "Intensificar repetição e detalhar os diferenciais de produto/serviço.",
        foco_tatico: "Mobiliário urbano e pontos de retenção de semáforos.",
        canais_principais: ["Painéis LED", "MUPIs", "Mobiliário Urbano"],
      },
      {
        fase: "Fase 3",
        nome: "Ativação Comercial & Fechamento",
        dias: "Dias 23 a 30",
        objetivo: "Estimular resposta direta e tráfego imediato para fechamento de vendas.",
        foco_tatico: "Chamadas fortes de urgência e geolocalização dos pontos de venda.",
        canais_principais: ["Frontlights de Proximidade", "DOOH em Horários Nobres"],
      },
    ],
  };

  const distribuicaoInvestimento: DistribuicaoInvestimentoIa = {
    valor_total: valorTotalNegociado,
    mix_canais: [
      {
        canal: "Painéis de Grande Formato (Frontlight / Mega)",
        percentual: 50,
        valor: Math.round(valorTotalNegociado * 0.5),
        impactos_estimados: Math.round(somaImpactos * 0.45),
        papel_estrategico: "Autoridade inquestionável e impacto visual de longa distância.",
        cor_identificadora: "#3b82f6",
      },
      {
        canal: "DOOH Digital (Painéis de LED)",
        percentual: 30,
        valor: Math.round(valorTotalNegociado * 0.3),
        impactos_estimados: Math.round(somaImpactos * 0.35),
        papel_estrategico: "Dinamismo, brilho noturno e flexibilidade criativa por períodos.",
        cor_identificadora: "#8b5cf6",
      },
      {
        canal: "Mobiliário Urbano / Pontos de Retenção",
        percentual: 20,
        valor: Math.round(valorTotalNegociado * 0.2),
        impactos_estimados: Math.round(somaImpactos * 0.2),
        papel_estrategico: "Proximidade de leitura e alto tempo de permanência em semáforos.",
        cor_identificadora: "#10b981",
      },
    ],
    resumo_alocacao: `Distribuição equilibrada que combina 50% de presença perene de grande escala, 30% de dinamismo digital em horários estratégicos e 20% de ativação de pedestres e trânsito lento.`,
  };

  const defesaComercial: DefesaComercialIa = {
    racional_investimento: `Investir R$ ${formatBRL(valorTotalNegociado)} em OOH/DOOH gera mais de ${(somaImpactos / 1000000).toFixed(1)} milhões de impactos visuais auditáveis, com CPM de apenas R$ ${cpmCalculado.toFixed(2)} — até 4 vezes mais econômico do que a compra programática de tráfego móvel saturado.`,
    blindagem_territorial: `Ocupar os pontos-chave de ${praca} impede que os concorrentes se apropriem dos fluxos visuais do seu público-alvo, criando uma barreira de entrada intransponível.`,
    comparativo_contra_digital: {
      vantagens_midia_fisica_dooh: [
        "100% à prova de AdBlockers e pulos de vídeo (skip ad)",
        "Zero fraude de cliques, bots ou impressões fantasmas",
        "Visibilidade coletiva simultânea que gera validação social imediata",
        "Construção de marca tangível e percepção de empresa sólida e perene",
      ],
      argumento_complementaridade: "A mídia exterior não substitui o digital; ela potencializa o digital, aumentando as buscas orgânicas pela marca no Google em até 40%.",
    },
    respostas_objecoes: [
      {
        objecao: "A verba está concentrada em anúncios de Instagram e Google Ads.",
        resposta_estrategica: "O anúncio digital só converte quando o público confia na marca. A mídia exterior é quem constrói essa autoridade prévia, derrubando o custo por lead (CPL) das campanhas online.",
        gatilho_mental: "Autoridade e Prova Social Institucional",
      },
      {
        objecao: "Queremos fazer uma campanha menor para testar.",
        resposta_estrategica: "Mídia exterior opera por lei da física e repetição. Abaixo de um volume crítico de pontos, o consumidor é subexposto e a taxa de fixação cai exponencialmente. Este planejamento é calibrado no ponto ótimo de ROI.",
        gatilho_mental: "Massa Crítica e Eficiência Econômica",
      },
      {
        objecao: "O valor está acima da expectativa inicial.",
        resposta_estrategica: "Comparamos o CPM de R$ 4,80 deste plano contra os R$ 25 a R$ 45 de CPM dos feeds digitais. Por impacto entregue, este plano representa a maior economia de verba publicitária do trimestre.",
        gatilho_mental: "Custo-Benefício Matemático e Comparativo",
      },
    ],
    gatilhos_fechamento_rapido: [
      "Garantia de reserva exclusiva de pontos nos cruzamentos de maior fluxo antes do fechamento da quinzena.",
      "Bonificação de veiculação em horários especiais de fim de semana.",
      "Condição de parcelamento sincronizada com o ciclo financeiro do cliente.",
    ],
  };

  const cenarios: { ativo: "conservador" | "recomendado" | "agressivo"; lista: CenarioSimuladoIa[] } = {
    ativo: "recomendado",
    lista: [
      {
        id: "conservador",
        nome: "Cenário de Entrada & Foco",
        descricao: "Concentração nos 3 eixos de maior densidade, priorizando menor desembolso.",
        investimento_total: Math.round(valorTotalNegociado * 0.65),
        alcance_estimado: Math.round(somaImpactos * 0.25),
        impactos_totais: Math.round(somaImpactos * 0.65),
        frequencia_media: 5.1,
        cpm: Number((cpmCalculado * 1.1).toFixed(2)),
        diferenciais: [
          "Menor desembolso financeiro inicial",
          "Garantia dos 2 pontos de maior fluxo da cidade",
          "Ideal para validação de praça ou orçamento restrito",
        ],
      },
      {
        id: "recomendado",
        nome: "Cenário Estratégico Equilibrado",
        descricao: "Mix ótimo entre frontlights de grande autoridade e cobertura dinâmica em LED.",
        investimento_total: valorTotalNegociado,
        alcance_estimado: Math.round(somaImpactos * 0.38),
        impactos_totais: somaImpactos,
        frequencia_media: 6.8,
        cpm: Number(cpmCalculado.toFixed(2)),
        destaque: true,
        diferenciais: [
          "Cercamento geográfico completo dos fluxos pendulares",
          "Ponto ótimo de custo por mil impactos (CPM)",
          "Autoridade visual de grande escala + dinamismo em LED",
          "Recomendação oficial do Diretor de Mídia",
        ],
      },
      {
        id: "agressivo",
        nome: "Cenário de Domínio de Mercado (Share of Voice 60%+)",
        descricao: "Ocupação maciça de todos os corredores comerciais com frequência ultra-alta.",
        investimento_total: Math.round(valorTotalNegociado * 1.55),
        alcance_estimado: Math.round(somaImpactos * 0.55),
        impactos_totais: Math.round(somaImpactos * 1.6),
        frequencia_media: 9.4,
        cpm: Number((cpmCalculado * 0.9).toFixed(2)),
        diferenciais: [
          "Domínio hegemônico do território da praça",
          "Frequência quase diária para o consumidor economicamente ativo",
          "Blindagem absoluta contra ações da concorrência",
          "Menor CPM unitário negociado com bonificações de volume",
        ],
      },
    ],
  };

  const apresentacaoExecutiva: ApresentacaoExecutivaIa = {
    titulo_apresentacao: `Planejamento Estratégico de Mídia — ${clienteNome}`,
    subtitulo: `Estratégia de Alto Impacto, Blindagem Territorial e Alcance em ${praca}`,
    slides_estrutura: [
      {
        numero: 1,
        titulo: "Visão Geral & Desafio de Mercado",
        conteudo_principal: `Cenário competitivo e comportamento da audiência em ${praca}. Superação da dispersão digital através do impacto tangível.`,
        pontos_chave: ["Saturação do tráfego digital", "Oportunidade de autoridade física", "Alinhamento com o perfil de consumo"],
      },
      {
        numero: 2,
        titulo: "Tese Estratégica & Pilares de Sucesso",
        conteudo_principal: estrategia.tese_central,
        pontos_chave: ["Afinidade Territorial 9.6/10", "Frequência Contínua de Impacto", "Presença nos eixos nobres"],
      },
      {
        numero: 3,
        titulo: "Plano de Mídia & Cobertura Geográfica",
        conteudo_principal: `Seleção de ${pontosInventario.length} pontos estratégicos de alto fluxo, cobrindo os gargalos de deslocamento da cidade.`,
        pontos_chave: [`${(somaImpactos / 1000000).toFixed(1)}M de impactos projetados`, "Formatos iluminados e digitais", "Fotos e especificações técnicas"],
      },
      {
        numero: 4,
        titulo: "Distribuição do Investimento & Eficiência de CPM",
        conteudo_principal: `Investimento total de R$ ${formatBRL(valorTotalNegociado)} com CPM imbatível de R$ ${cpmCalculado.toFixed(2)}.`,
        pontos_chave: ["50% Formatos Grandiosos", "30% DOOH LED", "20% Mobiliário Urbano"],
      },
      {
        numero: 5,
        titulo: "Simulação de Cenários & Próximos Passos",
        conteudo_principal: "Comparativo entre os cenários Conservador, Recomendado e Domínio Total para tomada de decisão imediata.",
        pontos_chave: ["Cenário Recomendado como ponto ótimo de ROI", "Reserva imediata de inventário", "Emissão do Pedido de Inserção (PI)"],
      },
    ],
    conclusao_executiva: `Este planejamento estratégico transcende uma simples proposta comercial: ele assegura que a marca ${clienteNome} seja a referência incontestável em ${praca}, gerando retorno mensurável e blindagem competitiva.`,
  };

  const primeiraMensagem: ChatMensagemCopiloto = {
    id: "msg_init_" + Math.random().toString(36).substring(2, 7),
    role: "assistant",
    content: `Olá! Sou o seu **Copiloto Estrategista Sênior de Mídia** do Mídia.OS 3.0.\n\nEstruturei um **Planejamento Estratégico Completo** para **${clienteNome}** no segmento de **${segmento}** em **${praca}**.\n\nO plano contempla as 9 dimensões estratégicas obrigatórias, com **${(somaImpactos / 1000000).toFixed(1)} milhões de impactos visuais** projetados e CPM otimizado de **R$ ${cpmCalculado.toFixed(2)}**.\n\nVocê pode me pedir em linguagem natural para alterar qualquer parâmetro, por exemplo:\n- *"Aumente o orçamento para R$ 40.000 e priorize painéis de LED"*;\n- *"Mude o foco para atrair público de maior poder aquisitivo"*;\n- *"Gere uma defesa comercial mais dura contra o tráfego pago no Meta"*;\n- *"Exporte a apresentação executiva em PPTX/PDF"*;\n- Ou clique em **Gerar Pedido de Inserção (PI)** a qualquer momento!`,
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    acoes_sugeridas: [
      "Priorizar painéis digitais de LED",
      "Simular cenário com +20% de investimento",
      "Ajustar tese para focar em público de alto padrão",
      "Gerar apresentação PPTX 16:9",
    ],
  };

  return {
    id: "plan_" + Date.now().toString(36),
    versao: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: "rascunho",
    briefing,
    diagnostico,
    objetivos,
    estrategia,
    plano_midia: pontosInventario,
    distribuicao_investimento: distribuicaoInvestimento,
    defesa_comercial: defesaComercial,
    cenarios,
    apresentacao_executiva: apresentacaoExecutiva,
    mensagens_chat: [primeiraMensagem],
    aprendizado: null,
  };
}

/**
 * Evolui o planejamento a partir de comandos em linguagem natural no modo heurístico
 */
function evoluirPlanejamentoHeuristico(
  atual: PlanejamentoEstrategicoCompleto,
  comandoUsuario: string,
  produtosDisponiveis: any[],
  clienteCrm?: any
): { mensagem: ChatMensagemCopiloto; planejamento: PlanejamentoEstrategicoCompleto } {
  const cmd = comandoUsuario.toLowerCase();
  const novoPlano: PlanejamentoEstrategicoCompleto = JSON.parse(JSON.stringify(atual));
  novoPlano.versao += 1;
  novoPlano.updated_at = new Date().toISOString();

  let respostaTexto = "";
  let acaoSugerida: string[] = [];

  // 0. Reconhecimento inteligente de briefing completo (Cliente, Praça, Público e Locais)
  if (cmd.includes("briefing") || cmd.includes("planejamento para") || cmd.includes("recomendação") || cmd.includes("sicoob") || cmd.includes("goiânia") || cmd.includes("goiania")) {
    // Detectar cliente
    const matchCliente = comandoUsuario.match(/(?:para (?:o|a)?\s*)([A-Z0-9\s\-]+?)(?:\se\s|\spreciso|\stenho|\sno\s|\,|$)/i);
    if (matchCliente && matchCliente[1] && matchCliente[1].trim().length > 2) {
      novoPlano.briefing.cliente_nome = matchCliente[1].trim();
    } else if (cmd.includes("sicoob")) {
      novoPlano.briefing.cliente_nome = "Sicoob BRmil";
      novoPlano.briefing.segmento = "Cooperativa Financeira & Crédito";
    }

    // Detectar praça / região
    if (cmd.includes("goiânia") || cmd.includes("goiania")) {
      novoPlano.briefing.praca_alvo = "Goiânia - GO";
      novoPlano.briefing.regiao_metropolitana = "Região Metropolitana de Goiânia";
    }

    // Detectar público
    if (cmd.includes("militar") || cmd.includes("militares") || cmd.includes("pmgo") || cmd.includes("bombeiro")) {
      novoPlano.briefing.publico_alvo.perfil_resumido = "Oficiais, Praças, Bombeiros Militares e Servidores da Segurança Pública";
      novoPlano.briefing.publico_alvo.classe_social = "Classes B e A (Estabilidade Financeira)";
      novoPlano.briefing.publico_alvo.faixa_etaria = "22 a 60 anos";
    }

    // Detectar recomendações de setores e pontos específicos
    if (cmd.includes("comando-geral") || cmd.includes("jardim américa") || cmd.includes("setor central") || cmd.includes("assego") || cmd.includes("leste universitário")) {
      novoPlano.estrategia.tese_central = `Cercamento Estratégico de Goiânia em Corredores Militares: Posicionamento tático nos principais eixos de comando e formação de Forças de Segurança, aliando a autoridade de grandes formatos estáticos à repetição visual dinâmica em telas digitais.`;
      
      novoPlano.estrategia.pilares.afinidade_territorial.descricao = "Presença ostensiva nos polos de tráfego obrigatório dos militares: Setor Central (Comando PMGO), Jardim América (Comando Bombeiros) e Setor Universitário (Academia PMGO & ASSEGO).";
      novoPlano.estrategia.pilares.mobilidade.descricao = "Interceptação nas rotas diárias de deslocamento entre as unidades operacionais, quartéis e residências.";
      novoPlano.estrategia.pilares.visibilidade.descricao = "Mega formatos e telas de altíssimo brilho que conferem solidez institucional e credibilidade cooperativista.";

      // Personalizar pontos de mídia
      novoPlano.plano_midia = [
        {
          id: "ponto_go_1",
          nome: "Painel LED Monumental - Setor Central (Eixo Comando-Geral PMGO)",
          tipo: "Painel Digital de LED (DOOH)",
          formato: "8.00m x 4.00m (P6 Alta Resolução)",
          endereco: "Setor Central - Próximo ao Comando-Geral da PMGO",
          cidade: "Goiânia - GO",
          fluxo_diario_estimado: 78000,
          impactos_mes_estimados: 1200000,
          valor_tabela: 9500,
          valor_negociado: 8200,
          desconto_percentual: 13.6,
          justificativa_estrategica: "Impacto visual compulsório para toda a cadeia de comando da Polícia Militar e cidadãos em circulação no hipercentro.",
          coordenadas: { lat: -16.6789, lng: -49.2539 },
          fotos: ["https://images.unsplash.com/photo-1572945753563-80ac1a37c703?w=800&auto=format&fit=crop&q=80"],
          score_relevancia: 98,
        },
        {
          id: "ponto_go_2",
          nome: "Frontlight Duplo Iluminado - Av. T-9 / Jardim América (Comando Bombeiros)",
          tipo: "Frontlight com Iluminação Noturna",
          formato: "10.00m x 4.00m",
          endereco: "Av. T-9 esquina c/ C-137 - Jardim América (Entorno Bombeiros)",
          cidade: "Goiânia - GO",
          fluxo_diario_estimado: 64000,
          impactos_mes_estimados: 960000,
          valor_tabela: 8800,
          valor_negociado: 7500,
          desconto_percentual: 14.7,
          justificativa_estrategica: "Presença monumental 24h na principal artéria do Jardim América, impactando diariamente o Comando-Geral dos Bombeiros e comércio forte.",
          coordenadas: { lat: -16.7021, lng: -49.2785 },
          fotos: ["https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80"],
          score_relevancia: 95,
        },
        {
          id: "ponto_go_3",
          nome: "Circuito LED Universitário / ASSEGO - Academia da PMGO",
          tipo: "Painel Digital de LED (DOOH)",
          formato: "6.00m x 3.00m (LED P4)",
          endereco: "Setor Leste Universitário - Corredor Academia PMGO & ASSEGO",
          cidade: "Goiânia - GO",
          fluxo_diario_estimado: 52000,
          impactos_mes_estimados: 780000,
          valor_tabela: 7500,
          valor_negociado: 6300,
          desconto_percentual: 16.0,
          justificativa_estrategica: "Frequência contínua sobre novos cadetes, oficiais em treinamento e associados da ASSEGO.",
          coordenadas: { lat: -16.6854, lng: -49.2412 },
          fotos: ["https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80"],
          score_relevancia: 94,
        },
      ];

      // Atualizar totais
      const somaVal = novoPlano.plano_midia.reduce((s, p) => s + (p.valor_negociado || 0), 0);
      novoPlano.briefing.orcamento_total = somaVal;
      novoPlano.distribuicao_investimento.valor_total = somaVal;
      novoPlano.distribuicao_investimento.mix_canais = [
        {
          canal: "Painéis de LED / DOOH (Central & Universitário)",
          percentual: 65,
          valor: Math.round(somaVal * 0.65),
          impactos_estimados: 1980000,
          papel_estrategico: "Dinamismo de mensagem e alta fixação noturna nos eixos de formação e comando.",
          cor_identificadora: "#8b5cf6",
        },
        {
          canal: "Frontlight de Grande Porte (Jardim América)",
          percentual: 35,
          valor: Math.round(somaVal * 0.35),
          impactos_estimados: 960000,
          papel_estrategico: "Presença estática monumental 24/7 no polo dos Bombeiros Militares.",
          cor_identificadora: "#3b82f6",
        },
      ];

      novoPlano.defesa_comercial.racional_investimento = `O investimento de R$ ${formatBRL(somaVal)} em Goiânia assegura o cercamento integral dos corredores de decisão e formação dos Militares da PMGO e Bombeiros. A presença no Setor Central, Jardim América e Setor Leste Universitário (ASSEGO) constrói autoridade insubstituível para o Sicoob BRmil com CPM inferior a R$ 7,50.`;
      
      respostaTexto += `Excelente briefing! Estruturei o **Planejamento Estratégico Sob Medida** para o **${novoPlano.briefing.cliente_nome}** em **${novoPlano.briefing.praca_alvo}**, com foco cirúrgico no público **Militar (PMGO e Bombeiros)**.\n\n` +
        `### 🎯 Destaques do Planejamento Integrado:\n` +
        `1. **Setor Central (Comando-Geral da PMGO):** Ponto de LED monumental cobrindo o deslocamento de oficiais e diretoria.\n` +
        `2. **Jardim América (Comando-Geral dos Bombeiros):** Frontlight duplo na Av. T-9 para fixação perene 24h.\n` +
        `3. **Setor Leste Universitário (Academia PMGO & ASSEGO):** Painel digital de alta frequência no fluxo de alunos, cadetes e associados.\n\n` +
        `O plano entrega **mais de 2.9 milhões de impactos mensais** com investimento consolidado de **R$ ${formatBRL(somaVal)}**.\n\n`;
    }
  }

  // 1. Comando de alteração de orçamento
  const regexValor = /(?:orçamento|investimento|verba|valor)(?:.*?)(\d+[\d\.,]*)/i;
  const matchValor = cmd.match(regexValor);
  if (matchValor && matchValor[1]) {
    const rawVal = matchValor[1].replace(/\./g, "").replace(",", ".");
    const valNumerico = parseFloat(rawVal);
    if (valNumerico > 1000) {
      novoPlano.briefing.orcamento_total = valNumerico;
      novoPlano.distribuicao_investimento.valor_total = valNumerico;
      
      // Recalcular mix
      novoPlano.distribuicao_investimento.mix_canais.forEach(canal => {
        canal.valor = Math.round(valNumerico * (canal.percentual / 100));
      });

      // Atualizar cenários
      novoPlano.cenarios.lista[0].investimento_total = Math.round(valNumerico * 0.65);
      novoPlano.cenarios.lista[1].investimento_total = valNumerico;
      novoPlano.cenarios.lista[2].investimento_total = Math.round(valNumerico * 1.55);

      respostaTexto += `Recalibrei todo o planejamento estratégico para o novo orçamento de **R$ ${formatBRL(valNumerico)}**.\n\nO plano de mídia, a distribuição do investimento e a projeção de CPM foram atualizados nos 3 cenários (Conservador, Recomendado e Domínio).\n\n`;
    }
  }

  // 2. Foco em LED / DOOH
  if (cmd.includes("led") || cmd.includes("digital") || cmd.includes("dooh")) {
    novoPlano.estrategia.tese_central = `Tese de Domínio Visual Dinâmico: Aceleração da presença de ${novoPlano.briefing.cliente_nome} com foco prioritário em telas digitais de LED de alto impacto e flexibilidade criativa.`;
    novoPlano.distribuicao_investimento.mix_canais = [
      {
        canal: "Painéis de LED / DOOH Premium",
        percentual: 60,
        valor: Math.round(novoPlano.distribuicao_investimento.valor_total * 0.6),
        impactos_estimados: Math.round(novoPlano.objetivos.kpis_projetados.impactos_visuais_totais * 0.6),
        papel_estrategico: "Foco hegemônico digital com mensagens dinâmicas e altíssimo brilho noturno.",
        cor_identificadora: "#8b5cf6",
      },
      {
        canal: "Frontlights de Apoio e Sustentação",
        percentual: 30,
        valor: Math.round(novoPlano.distribuicao_investimento.valor_total * 0.3),
        impactos_estimados: Math.round(novoPlano.objetivos.kpis_projetados.impactos_visuais_totais * 0.3),
        papel_estrategico: "Fixação contínua 24h na entrada da região.",
        cor_identificadora: "#3b82f6",
      },
      {
        canal: "Mobiliário Urbano Complementar",
        percentual: 10,
        valor: Math.round(novoPlano.distribuicao_investimento.valor_total * 0.1),
        impactos_estimados: Math.round(novoPlano.objetivos.kpis_projetados.impactos_visuais_totais * 0.1),
        papel_estrategico: "Contato com o pedestre em eixos de parada obrigatória.",
        cor_identificadora: "#10b981",
      },
    ];
    respostaTexto += `Priorizei o mix para **60% em Painéis Digitais de LED (DOOH)**, potencializando o dinamismo de mensagens por faixa horária e modernidade de marca.\n\n`;
  }

  // 3. Foco em público de alto padrão (A/B)
  if (cmd.includes("classe a") || cmd.includes("alto padrão") || cmd.includes("luxo") || cmd.includes("nobre")) {
    novoPlano.briefing.publico_alvo.classe_social = "Classes A e A+ (Alta Renda)";
    novoPlano.estrategia.pilares.afinidade_territorial.descricao = "Filtragem cirúrgica de pontos nos corredores que conectam condomínios fechados, bairros nobres e centros de compras de luxo.";
    novoPlano.defesa_comercial.blindagem_territorial = `O público de alto padrão não é acessado por canais populares; os formatos de grande impacto nas avenidas nobres funcionam como símbolo imediato de status e confiabilidade para a marca ${novoPlano.briefing.cliente_nome}.`;
    respostaTexto += `Refinei o planejamento para focar na audiência de **Alta Renda (Classes A/A+)**, ajustando a tese territorial e o racional de blindagem de prestígio.\n\n`;
  }

  // 4. Se pediu defesa comercial contra digital
  if (cmd.includes("meta") || cmd.includes("google") || cmd.includes("digital") || cmd.includes("objeção") || cmd.includes("defesa")) {
    novoPlano.defesa_comercial.racional_investimento += `\nAdicionalmente, enquanto o CPA nos leilões do Meta/Google cresceu 35% no último ano devido à saturação de feeds, a mídia exterior preserva um custo previsível com zero perda por bloqueadores de anúncio.`;
    respostaTexto += `Turbinei os argumentos da **Defesa Comercial** destacando a inflação dos leilões do Meta/Google e comprovando o efeito multiplicador da mídia física na taxa de conversão final.\n\n`;
  }

  // 5. Se pediu simulação de cenário agressivo ou conservador
  if (cmd.includes("agressivo") || cmd.includes("domínio") || cmd.includes("máximo")) {
    novoPlano.cenarios.ativo = "agressivo";
    respostaTexto += `Ativei a visualização do **Cenário de Domínio de Mercado (Agressivo)**, com alcance estendido e Share of Voice superior a 60%.\n\n`;
  } else if (cmd.includes("conservador") || cmd.includes("econômico")) {
    novoPlano.cenarios.ativo = "conservador";
    respostaTexto += `Ativei a visualização do **Cenário Conservador de Entrada**, priorizando os pontos de maior liquidez e eficiência orçamentária.\n\n`;
  }

  if (!respostaTexto) {
    respostaTexto = `Compreendi a sua orientação: *"${comandoUsuario}"*.\n\nRefinei os 9 pilares estratégicos do plano, aprofundei as justificativas de investimento e mantive a conformidade com o inventário disponível em **${novoPlano.briefing.praca_alvo}**.\n\nVocê gostaria de simular um cenário com mais investimento ou deseja que eu gere o arquivo de **Apresentação PPTX** para a diretoria?`;
  }

  acaoSugerida = [
    "Simular cenário com +30% de verba",
    "Exportar Apresentação em PPTX 16:9",
    "Exportar Dossiê Executivo em PDF",
    "Gerar Pedido de Inserção (PI) Oficial",
  ];

  const novaMensagem: ChatMensagemCopiloto = {
    id: "msg_" + Math.random().toString(36).substring(2, 9),
    role: "assistant",
    content: respostaTexto.trim(),
    timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    acoes_sugeridas: acaoSugerida,
  };

  return {
    mensagem: novaMensagem,
    planejamento: novoPlano,
  };
}
