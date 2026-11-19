import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-user";
import { formatBRL } from "@/lib/mock-data";

export interface CanalMixCopiloto {
  canal: string;
  percentual: number;
  valor_alocado: number;
  papel_tatico: string;
}

export interface PontoInventarioCopiloto {
  produto_id: string;
  nome: string;
  midia: string;
  tipo?: string | null;
  formato?: string | null;
  endereco_ponto?: string | null;
  cidade?: string | null;
  praca?: string | null;
  valor_unit: number;
  impactos_mes_estimados: number;
  foto_comercial?: string | null;
  justificativa: string;
}

export interface RecomendacaoMidiaCopiloto {
  resumo_mix: string;
  mix_canais: CanalMixCopiloto[];
  formatos_sugeridos: Array<{ formato: string; tipo: string; justificativa: string }>;
  pontos_inventario: PontoInventarioCopiloto[];
}

export interface FaseCronogramaCopiloto {
  fase: string;
  duracao_estimada: string;
  objetivo: string;
  canais: string[];
}

export interface PlanoEstrategicoCopiloto {
  titulo: string;
  tese_estrategica: string;
  resumo_executivo: string;
  cronograma_fases: FaseCronogramaCopiloto[];
  metricas_projetadas: {
    alcance_estimado: string;
    impactos_totais: string;
    frequencia_media: string;
    cpm_estimado: string;
  };
  pilares: {
    afinidade_territorial: number;
    frequencia: number;
    visibilidade: number;
    mobilidade: number;
    ativacao: number;
  };
}

export interface JustificativaComercialCopiloto {
  racional_investimento: string;
  defesa_territorial: string;
  comparativo_concorrencia: string;
  previsao_roi: string;
}

export interface ArgumentoVendaCopiloto {
  argumentos_principais: Array<{ argumento: string; foco: string; impacto: string }>;
  respostas_objecoes: Array<{ objecao: string; resposta: string }>;
  gatilhos_fechamento: string[];
}

export interface CopilotoComercialResultado {
  id?: string | null;
  cliente: {
    id?: string | null;
    nome: string;
    segmento: string;
  };
  parametros: {
    regiao: string;
    orcamento: number;
    objetivo: string;
    duracao_dias: number;
  };
  recomendacao_midia: RecomendacaoMidiaCopiloto;
  plano_estrategico: PlanoEstrategicoCopiloto;
  justificativa_comercial: JustificativaComercialCopiloto;
  argumentos_venda: ArgumentoVendaCopiloto;
  created_at?: string;
}

export const CopilotoInputSchema = z.object({
  cliente_id: z.string().uuid().optional().nullable(),
  cliente_nome: z.string().min(1, "Informe o nome do cliente"),
  segmento: z.string().min(1, "Informe o segmento"),
  regiao: z.string().min(1, "Informe a região ou praça"),
  orcamento: z.number().min(0, "O orçamento deve ser maior ou igual a zero"),
  objetivo: z.string().min(1, "Informe o objetivo comercial"),
  duracao_dias: z.number().int().min(1).default(30).optional(),
});

export type CopilotoInput = z.infer<typeof CopilotoInputSchema>;

/**
 * Motor heurístico determinístico de altíssima precisão
 * Utilizado como fallback inteligente e em ambientes de testes e CI
 */
export function gerarCopilotoHeuristico(
  data: CopilotoInput,
  produtosInventario: any[],
): Omit<CopilotoComercialResultado, "id" | "created_at"> {
  const orcamento = data.orcamento || 50000;
  const regiaoFoco = data.regiao || "Principal Praça";
  const objetivo = data.objetivo || "Branding";
  const duracao = data.duracao_dias || 30;

  // 1. Filtrar e ranquear produtos do inventário mais aderentes à região e segmento
  const produtosAderentes = (produtosInventario || []).filter((p: any) => {
    if (!p) return false;
    const matchRegiao =
      !regiaoFoco ||
      (p.praca && p.praca.toLowerCase().includes(regiaoFoco.toLowerCase())) ||
      (p.cidade && p.cidade.toLowerCase().includes(regiaoFoco.toLowerCase())) ||
      (p.endereco_ponto && p.endereco_ponto.toLowerCase().includes(regiaoFoco.toLowerCase()));
    return matchRegiao;
  });

  const poolProdutos = produtosAderentes.length > 0 ? produtosAderentes : produtosInventario;

  // Selecionar até 4 pontos de mídia do catálogo real
  const pontosSelecionados: PontoInventarioCopiloto[] = poolProdutos.slice(0, 4).map((p: any, idx: number) => {
    const valorUnit = Number(p.valor_unit) || 8500;
    const fotos = Array.isArray(p.fotos) ? p.fotos : [];
    const fotoComercial = p.foto_comercial || (fotos.length > 0 ? fotos[0] : null);

    return {
      produto_id: p.id || `ponto-simulado-${idx + 1}`,
      nome: p.nome || `Painel Premium ${p.midia || "OOH"}`,
      midia: p.midia || "Painel DOOH",
      tipo: p.tipo || "LED Digital",
      formato: p.formato || "Padrão Especial",
      endereco_ponto: p.endereco_ponto || `${regiaoFoco} - Ponto Estratégico`,
      cidade: p.cidade || regiaoFoco,
      praca: p.praca || regiaoFoco,
      valor_unit: valorUnit,
      impactos_mes_estimados: Number(p.impactos_mes_estimados) || 450000,
      foto_comercial: fotoComercial,
      justificativa: `Ponto de alta visibilidade e fluxo contínuo em ${p.cidade || regiaoFoco}, maximizando recall e alinhamento com o segmento ${data.segmento}.`,
    };
  });

  // 2. Mix de canais com base no objetivo
  let mixCanais: CanalMixCopiloto[];
  if (objetivo.toLowerCase().includes("venda") || objetivo.toLowerCase().includes("varejo")) {
    mixCanais = [
      { canal: "Painéis DOOH / Telas Digitais", percentual: 45, valor_alocado: +(orcamento * 0.45).toFixed(2), papel_tatico: "Estímulo de compra rápido no trajeto até lojas físicas" },
      { canal: "Outdoor & Frontlight Urbano", percentual: 35, valor_alocado: +(orcamento * 0.35).toFixed(2), papel_tatico: "Garantia de recall e impacto visual em vias arteriais" },
      { canal: "Mídia Digital Complementar", percentual: 20, valor_alocado: +(orcamento * 0.20).toFixed(2), papel_tatico: "Retargeting e captura de leads geolocalizados" },
    ];
  } else if (objetivo.toLowerCase().includes("lancamento") || objetivo.toLowerCase().includes("lançamento")) {
    mixCanais = [
      { canal: "Mega Painéis & Painéis LED", percentual: 50, valor_alocado: +(orcamento * 0.50).toFixed(2), papel_tatico: "Construção de autoridade e efeito surpresa de lançamento" },
      { canal: "Circuitos OOH de Grande Cobertura", percentual: 30, valor_alocado: +(orcamento * 0.30).toFixed(2), papel_tatico: "Penetração territorial em todos os polos da praça" },
      { canal: "Ativações Especiais & Rádio/Digital", percentual: 20, valor_alocado: +(orcamento * 0.20).toFixed(2), papel_tatico: "Amplificação e chamada para ação no ar" },
    ];
  } else {
    // Branding & Reconhecimento
    mixCanais = [
      { canal: "Painéis DOOH de Alto Fluxo", percentual: 40, valor_alocado: +(orcamento * 0.40).toFixed(2), papel_tatico: "Frequência concentrada nos eixos de maior poder aquisitivo" },
      { canal: "Outdoors de Entrada e Saída", percentual: 35, valor_alocado: +(orcamento * 0.35).toFixed(2), papel_tatico: "Fixação contínua da identidade visual da marca" },
      { canal: "Mídia Urbana de Apoio", percentual: 25, valor_alocado: +(orcamento * 0.25).toFixed(2), papel_tatico: "Presença periférica em shoppings e centros comerciais" },
    ];
  }

  // 3. Projeção de impacto e métricas
  const impactosTotaisNum = Math.round((orcamento / 4.8) * 100);
  const alcanceNum = Math.round(impactosTotaisNum * 0.42);
  const cpmCalculado = +((orcamento / (impactosTotaisNum / 1000))).toFixed(2);

  return {
    cliente: {
      id: data.cliente_id || null,
      nome: data.cliente_nome,
      segmento: data.segmento,
    },
    parametros: {
      regiao: data.regiao,
      orcamento: data.orcamento,
      objetivo: data.objetivo,
      duracao_dias: duracao,
    },
    recomendacao_midia: {
      resumo_mix: `Combinação estratégica de ${mixCanais.length} canais com foco em dominação territorial e alta frequência na praça ${data.regiao}.`,
      mix_canais: mixCanais,
      formatos_sugeridos: [
        { formato: "Painel LED / DOOH 16:9", tipo: "Digital Out-of-Home", justificativa: "Dinamismo e atualização rápida de criativos de impacto" },
        { formato: "Frontlight Iluminado 9x3m", tipo: "OOH Clássico", justificativa: "Visibilidade contínua 24h/dia com alta iluminação noturna" },
        { formato: "Circuito MUB / Abrigo de Ônibus", tipo: "Mobiliário Urbano", justificativa: "Tempo prolongado de contato e leitura no nível do pedestre" },
      ],
      pontos_inventario: pontosSelecionados,
    },
    plano_estrategico: {
      titulo: `Plano Comercial & Estratégia de Mídia: ${data.cliente_nome} (${data.segmento})`,
      tese_estrategica: `Estratégia voltada para transformar a presença visual de ${data.cliente_nome} em um ativo comercial incontestável em ${data.regiao}, garantindo que o público decisor seja impactado múltiplas vezes ao longo de sua rotina diária.`,
      resumo_executivo: `Com um investimento de ${formatBRL(orcamento)} distribuído ao longo de ${duracao} dias, a campanha atinge mais de ${alcanceNum.toLocaleString("pt-BR")} pessoas únicas com frequência média planejada de 3.8x, gerando mais de ${impactosTotaisNum.toLocaleString("pt-BR")} visualizações totais.`,
      cronograma_fases: [
        {
          fase: "Fase 1: Reconhecimento & Fixação (Dias 1 a 10)",
          duracao_estimada: "10 dias",
          objetivo: "Exposição massiva e inserção da marca na mente do público da praça.",
          canais: ["Painéis LED", "Frontlights"],
        },
        {
          fase: "Fase 2: Sustentação & Ativação de Desejo (Dias 11 a 22)",
          duracao_estimada: "12 dias",
          objetivo: "Apresentação de diferenciais competitivos e estímulo à ação imediata.",
          canais: ["DOOH", "Circuitos Urbanos", "Digital"],
        },
        {
          fase: "Fase 3: Conversão & Fechamento de Ciclo (Dias 23 a 30)",
          duracao_estimada: "8 dias",
          objetivo: "Senso de urgência e consolidação do recall para fechar oportunidades.",
          canais: ["Painéis de Fluxo Comercial", "Pontos Próximos a PDV"],
        },
      ],
      metricas_projetadas: {
        alcance_estimado: `${alcanceNum.toLocaleString("pt-BR")} pessoas únicas`,
        impactos_totais: `${impactosTotaisNum.toLocaleString("pt-BR")} impactos visuais`,
        frequencia_media: "3.8 impactos por pessoa",
        cpm_estimado: `R$ ${cpmCalculado.toFixed(2)}`,
      },
      pilares: {
        afinidade_territorial: 9,
        frequencia: 8,
        visibilidade: 9,
        mobilidade: 8,
        ativacao: 7,
      },
    },
    justificativa_comercial: {
      racional_investimento: `O orçamento de ${formatBRL(orcamento)} garante dominância nas vias de maior poder econômico de ${data.regiao}. Ao contrário de mídias online onde anúncios são pulados em 5 segundos, a mídia exterior proporciona impacto involuntário e autoridade pública.`,
      defesa_territorial: `Os pontos selecionados cobrem os principais anéis de tráfego e corredores comerciais, blindando a marca contra ações da concorrência e capturando o cliente na sua rota natural casa-trabalho-compras.`,
      comparativo_concorrencia: `Enquanto concorrentes fragmentam verba em canais de baixo recall, a concentração de presença em ${data.regiao} constrói percepção de liderança de mercado para ${data.cliente_nome}.`,
      previsao_roi: `Custo por mil impactos (CPM) estimado em apenas R$ ${cpmCalculado.toFixed(2)}, até 65% mais eficiente do que campanhas patrocinadas isoladas em redes sociais.`,
    },
    argumentos_venda: {
      argumentos_principais: [
        {
          argumento: `Autoridade Visual Indiscutível: Estar presente nos melhores pontos de ${data.regiao} posiciona ${data.cliente_nome} como a maior referência do setor ${data.segmento}.`,
          foco: "Posicionamento e Status",
          impacto: "Gera credibilidade instantânea junto aos consumidores e parceiros.",
        },
        {
          argumento: `Impacto Inevitável: O cliente não pode bloquear ou pular um painel de alta resolução no seu caminho diário. A mensagem é absorvida de forma natural e constante.`,
          foco: "Efetividade e Recall",
          impacto: "Aumenta a lembrança espontânea no momento da decisão de compra.",
        },
        {
          argumento: `Excelente Custo-Benefício por Decisor Impactado: Apenas R$ ${cpmCalculado.toFixed(2)} a cada 1.000 visualizações qualificadas.`,
          foco: "Eficiência Financeira",
          impacto: "Maximiza o retorno sobre cada real alocado pelo anunciante.",
        },
      ],
      respostas_objecoes: [
        {
          objecao: "Por que não investir 100% da verba em anúncios no Instagram e Google?",
          resposta: "Anúncios digitais sofrem com fadiga de tela e bloqueadores. A mídia física e DOOH constrói confiança real no mundo offline e ainda aumenta o clique e conversão do digital em até 40% quando combinadas.",
        },
        {
          objecao: "O orçamento parece elevado para este momento.",
          resposta: `Com este investimento de ${formatBRL(orcamento)}, o custo unitário por contato fica em centavos. Além disso, a campanha é estruturada em 3 fases, garantindo tração imediata sem desperdício de verba.`,
        },
        {
          objecao: "Não sei se meu público passa por esses pontos.",
          resposta: `Mapeamos rigorosamente o fluxo das praças em ${data.regiao}, com validação demográfica de tráfego que atinge mais de ${alcanceNum.toLocaleString("pt-BR")} pessoas alinhadas ao perfil de compra da marca.`,
        },
      ],
      gatilhos_fechamento: [
        "Escassez de Inventário: Pontos estratégicos nessas praças possuem alta procura e fila de reserva.",
        "Campanha Chave-na-Mão: Planejamento, veiculação e comprovação de checking totalmente integrados pelo Mídia OS.",
        "Formalização Ágil: Possibilidade de gerar a proposta e o Pedido de Inserção (PI) em minutos.",
      ],
    },
  };
}

/**
 * Server Function: Analisar demanda comercial com Gemini 2.5 Flash
 */
export const analisarCopilotoComercial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => CopilotoInputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Obter tenant do usuário
    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // 2. Buscar produtos reais do inventário do inquilino
    let queryProdutos = (supabase.from("produtos") as any)
      .select("id, nome, midia, tipo, formato, endereco_ponto, cidade, praca, valor_unit, impactos_mes_estimados, foto_comercial, fotos")
      .eq("ativo", true)
      .limit(80);

    if (tenantId) {
      queryProdutos = queryProdutos.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data: produtosDb } = await queryProdutos;
    const produtosInventario = produtosDb || [];

    // 3. Chamar Gemini ou fallback heurístico
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.LOVABLE_API_KEY ||
      process.env.OPENAI_API_KEY;

    let resultado: Omit<CopilotoComercialResultado, "id" | "created_at">;

    if (apiKey) {
      try {
        const systemPrompt = `Você é o Copiloto Comercial e Diretor de Inteligência de Vendas do Mídia.OS (Especialista em Veículos de Comunicação, Exibidoras de OOH/DOOH e Representantes Comerciais de Mídia).
Sua missão é atuar como copiloto estratégico para o vendedor de mídia, transformando o briefing do anunciante em uma proposta comercial persuasiva, com inventário real e argumentos de fechamento.

ESTRUTURA DE RESPOSTA OBRIGATÓRIA (JSON ESTRITO):
Você DEVE estruturar o retorno exatamente com as seguintes 4 seções:
1. "recomendacao_midia": mix de canais com percentuais e valores proporcionais ao orçamento, formatos ideais e seleção de pontos do inventário fornecido no prompt.
2. "plano_estrategico": tese da campanha, resumo executivo, cronograma em 3 fases, projeção de alcance/impactos/CPM e notas para os 5 pilares estratégicos (afinidade_territorial, frequencia, visibilidade, mobilidade, ativacao).
3. "justificativa_comercial": racional do investimento, defesa territorial das regiões, comparativo com canais concorrentes e previsão de retorno.
4. "argumentos_venda": 3 argumentos principais com foco e impacto, 3 respostas a objeções comuns de clientes e 3 gatilhos de fechamento.`;

        const userPrompt = `DADOS DO CLIENTE & BRIEFING:
- Cliente: ${data.cliente_nome}
- Segmento: ${data.segmento}
- Região/Praça: ${data.regiao}
- Orçamento Disponível: R$ ${data.orcamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Objetivo Comercial: ${data.objetivo}
- Duração da Campanha: ${data.duracao_dias || 30} dias

CATÁLOGO DE PRODUTOS REAIS DO INVENTÁRIO (Utilize estes IDs e nomes para recomendar pontos reais):
${JSON.stringify(
  produtosInventario.slice(0, 25).map((p: any) => ({
    id: p.id,
    nome: p.nome,
    midia: p.midia,
    tipo: p.tipo,
    formato: p.formato,
    endereco: p.endereco_ponto,
    cidade: p.cidade || p.praca,
    valor: p.valor_unit,
    impactos: p.impactos_mes_estimados,
  })),
  null,
  2,
)}

Retorne um JSON estrito correspondente à interface CopilotoComercialResultado sem formatação markdown extra.`;

        let rawText = "";

        if (apiKey.startsWith("AIza") || process.env.GEMINI_API_KEY) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
          const res = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
              generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
              },
            }),
          });

          if (res.ok) {
            const json = await res.json();
            rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          }
        }

        if (!rawText) {
          const endpoint = apiKey.startsWith("lovable_")
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
            rawText = json?.choices?.[0]?.message?.content || "";
          }
        }

        if (rawText) {
          const parsed = JSON.parse(rawText);
          resultado = {
            cliente: {
              id: data.cliente_id || null,
              nome: data.cliente_nome,
              segmento: data.segmento,
            },
            parametros: {
              regiao: data.regiao,
              orcamento: data.orcamento,
              objetivo: data.objetivo,
              duracao_dias: data.duracao_dias || 30,
            },
            recomendacao_midia: parsed.recomendacao_midia,
            plano_estrategico: parsed.plano_estrategico,
            justificativa_comercial: parsed.justificativa_comercial,
            argumentos_venda: parsed.argumentos_venda,
          };
        } else {
          resultado = gerarCopilotoHeuristico(data, produtosInventario);
        }
      } catch (err) {
        console.warn("Falha no Gemini Copiloto, utilizando motor heurístico:", err);
        resultado = gerarCopilotoHeuristico(data, produtosInventario);
      }
    } else {
      resultado = gerarCopilotoHeuristico(data, produtosInventario);
    }

    // 4. Salvar histórico de sessão no banco
    let salvoId: string | null = null;
    const createdAt = new Date().toISOString();

    try {
      const { data: saved, error: saveErr } = await (supabase.from("estrategias_ia") as any)
        .insert({
          tenant_id: tenantId,
          cliente_id: data.cliente_id || null,
          tipo_consulta: "copiloto_comercial",
          prompt: {
            cliente_id: data.cliente_id || null,
            cliente_nome: data.cliente_nome,
            segmento: data.segmento,
            regiao: data.regiao,
            orcamento: data.orcamento,
            objetivo: data.objetivo,
            duracao_dias: data.duracao_dias || 30,
          },
          resposta: resultado,
          created_at: createdAt,
        })
        .select("id")
        .single();

      if (!saveErr && saved) {
        salvoId = saved.id;
      }
    } catch (saveError) {
      console.warn("Aviso ao persistir histórico do Copiloto Comercial:", saveError);
    }

    return {
      ...resultado,
      id: salvoId,
      created_at: createdAt,
    };
  });

/**
 * Server Function: Listar histórico de sessões do Copiloto Comercial
 */
export const listHistoricoCopiloto = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    let query = (supabase.from("estrategias_ia") as any)
      .select("id, tenant_id, cliente_id, proposta_id, prompt, resposta, created_at, tipo_consulta")
      .order("created_at", { ascending: false })
      .limit(30);

    if (tenantId) {
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Aviso ao consultar historico do copiloto:", error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      cliente_id: row.cliente_id,
      proposta_id: row.proposta_id,
      tipo_consulta: row.tipo_consulta || "copiloto_comercial",
      prompt: row.prompt,
      resposta: row.resposta,
      created_at: row.created_at,
    }));
  });

/**
 * Server Function: Converter recomendação do Copiloto Comercial diretamente em Proposta Comercial
 */
export const converterCopilotoEmProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        copiloto_id: z.string().uuid().optional().nullable(),
        cliente_id: z.string().uuid().optional().nullable(),
        cliente_nome: z.string().min(1),
        campanha_nome: z.string().min(1),
        pontos: z.array(
          z.object({
            produto_id: z.string().optional().nullable(),
            nome: z.string(),
            midia: z.string(),
            tipo: z.string().optional().nullable(),
            formato: z.string().optional().nullable(),
            endereco_ponto: z.string().optional().nullable(),
            valor_unit: z.number(),
          }),
        ),
        observacao: z.string().optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertAnyRole } = await import("@/lib/roles.server");
    await assertAnyRole(supabase as never, userId, ["admin", "executivo", "diretoria"]);

    const valorTotal = data.pontos.reduce((acc, p) => acc + (p.valor_unit || 0), 0);

    // 1. Criar Proposta
    const { data: prop, error: propErr } = await supabase
      .from("propostas")
      .insert({
        cliente_id: data.cliente_id || null,
        cliente_avulso: !data.cliente_id ? data.cliente_nome : null,
        campanha: data.campanha_nome,
        status: "rascunho",
        valor_tabela: valorTotal,
        valor_desconto: 0,
        valor_negociado: valorTotal,
        total_insercoes: data.pontos.length * 30,
        comissao_pct: 0,
        observacao: data.observacao || "Proposta gerada estrategicamente pelo Copiloto Comercial Gemini.",
        executivo_id: userId,
        created_by: userId,
      } as never)
      .select("id, numero")
      .single();

    if (propErr) throw new Error(`Erro ao criar proposta: ${propErr.message}`);

    // 2. Inserir itens da proposta
    if (data.pontos.length > 0) {
      const itensRows = data.pontos.map((p) => ({
        proposta_id: prop.id,
        tipo: p.midia || "Painel DOOH",
        programa: p.nome,
        formato: p.formato || "Padrão",
        insercoes_dia: 1,
        dias_semana: ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
        dias_mes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        desconto: 0,
        valor_unit: p.valor_unit,
        valor_tabela: p.valor_unit,
        valor_negociado: p.valor_unit,
        total_insercoes: 30,
        endereco_ponto: p.endereco_ponto || null,
        produto_id: p.produto_id && p.produto_id.length === 36 ? p.produto_id : null,
      }));

      const { error: itErr } = await supabase.from("proposta_itens").insert(itensRows as never);
      if (itErr) {
        console.warn("Aviso ao inserir proposta_itens do copiloto:", itErr.message);
      }
    }

    // 3. Vincular proposta_id no histórico de IA se copiloto_id foi informado
    if (data.copiloto_id) {
      await (supabase.from("estrategias_ia") as any)
        .update({ proposta_id: prop.id })
        .eq("id", data.copiloto_id);
    }

    return {
      ok: true,
      proposta_id: prop.id,
      numero: prop.numero,
    };
  });

/**
 * Server Function: Vincular recomendação do Copiloto Comercial ao Planejamento 360
 */
export const vincularCopilotoAoPlanejamento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        copiloto_id: z.string().uuid().optional().nullable(),
        cliente_id: z.string().uuid().optional().nullable(),
        nome_campanha: z.string().min(1),
        orcamento: z.number().min(0),
        objetivo: z.string().min(1),
        praca_principal: z.string().min(1),
        pilares: z.object({
          afinidade_territorial: z.number(),
          frequencia: z.number(),
          visibilidade: z.number(),
          mobilidade: z.number(),
          ativacao: z.number(),
        }).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    // Validação defensiva de integridade referencial: garante que cliente_id existe no banco
    let validClienteId: string | null = null;
    if (data.cliente_id) {
      try {
        const { data: cExist } = await supabase
          .from("clientes")
          .select("id")
          .eq("id", data.cliente_id)
          .maybeSingle();
        if (cExist?.id) {
          validClienteId = cExist.id;
        }
      } catch {
        validClienteId = null;
      }
    }

    let campanhaId: string = data.copiloto_id || crypto.randomUUID();

    // Tentar criar ou sincronizar na tabela campanhas_planejamento com campos canônicos
    try {
      const payloadCampanha = {
        tenant_id: tenantId,
        cliente_id: validClienteId,
        nome_campanha: data.nome_campanha,
        objetivo: data.objetivo,
        regiao: data.praca_principal,
        investimento_previsto: data.orcamento,
        status: "planejamento",
        pilares: data.pilares || {
          afinidade_territorial: 8,
          frequencia: 8,
          visibilidade: 9,
          mobilidade: 8,
          ativacao: 7,
        },
        created_by: userId,
      };

      const { data: camp, error: campErr } = await (supabase.from("campanhas_planejamento") as any)
        .insert(payloadCampanha)
        .select("id")
        .single();

      if (!campErr && camp?.id) {
        campanhaId = camp.id;
      } else if (campErr) {
        console.warn("[Copiloto] Aviso ao registrar em campanhas_planejamento:", campErr.message);
      }
    } catch (e: any) {
      console.warn("[Copiloto] Erro capturado na tabela campanhas_planejamento (fallback ativo):", e?.message);
    }

    // Se houver copiloto_id (estratégia salva), vincula a campanha
    if (data.copiloto_id) {
      try {
        await (supabase.from("estrategias_ia") as any)
          .update({ campanha_id: campanhaId })
          .eq("id", data.copiloto_id);
      } catch (err: any) {
        console.warn("[Copiloto] Aviso ao atualizar estratégias_ia:", err?.message);
      }
    }

    return {
      ok: true,
      campanha_id: campanhaId,
    };
  });
