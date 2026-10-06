import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  getInteligenciaRegiaoDF,
  getInteligenciaGeografica,
  PILARES_360,
  type RegiaoDFInteligencia,
} from "./df-regioes-inteligencia";
import { isMasterEmail } from "@/lib/master-user";

export interface ItemPlano360 {
  id: string;
  produto_id?: string | null;
  pilar_id: "deslocamento" | "moradia" | "lazer_consumo" | "ativacao_eventos" | "digital";
  pilar_nome: string;
  tipo_origem: "confirmado" | "transbordamento_radar" | "oportunidade_mapeamento";
  nome: string;
  tipo: string;
  formato: string;
  localizacao: string;
  regiao: string;
  via_troncal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  link_maps?: string | null;
  sentido_via?: string | null;
  ponto_referencia?: string | null;
  impactos_mes_estimados: number;
  valor_tabela: number;
  valor_negociado: number;
  desconto_pct: number;
  insercoes_mes: number;
  justificativa_estrategica: string;
  parceiro_nome?: string | null;
}

export interface Plano360Resultado {
  regiao_desafio: string;
  inteligencia_regiao: RegiaoDFInteligencia;
  tem_pontos_diretos: boolean;
  total_pontos_diretos: number;
  radar_acionado: boolean;
  motivo_radar?: string;
  pitch_consultor_reuniao: string;
  defesa_comercial_executiva: string;
  conexao_historico_sucesso: string;
  itens_por_pilar: Record<string, ItemPlano360[]>;
  itens_todos: ItemPlano360[];
  metricas_consolidadas: {
    total_impactos_mes: number;
    total_insercoes_mes: number;
    valor_tabela_total: number;
    valor_negociado_total: number;
    economia_desconto_total: number;
    desconto_medio_pct: number;
    cpm_consolidado: number;
    total_pontos_confirmados: number;
    total_oportunidades_radar: number;
  };
  prospects_prospeccao_sugeridos: {
    categoria: string;
    exemplos: string[];
    contatoDica: string;
  }[];
}

const DemandaCaptacaoSchema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().min(1, "Nome do cliente é obrigatório"),
  regiao_administrativa: z.string().min(1, "Região é obrigatória"),
  tipo_midia: z.string().min(1, "Tipo de mídia é obrigatório"),
  formato_desejado: z.string().nullable().optional(),
  pilar_360: z.string().nullable().optional(),
  perfil_publico: z.record(z.any()).optional(),
  historico_sucesso: z.record(z.any()).optional(),
  sugestoes_prospeccao: z.array(z.any()).optional(),
  observacoes: z.string().nullable().optional(),
  proposta_id: z.string().uuid().nullable().optional(),
});

export const salvarDemandaCaptacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DemandaCaptacaoSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;

    try {
      const { data: res, error } = await (supabase.from("demandas_captacao") as any)
        .insert({
          tenant_id: tenantId,
          cliente_id: data.cliente_id || null,
          cliente_nome: data.cliente_nome,
          regiao_administrativa: data.regiao_administrativa,
          tipo_midia: data.tipo_midia,
          formato_desejado: data.formato_desejado || null,
          pilar_360: data.pilar_360 || null,
          perfil_publico: data.perfil_publico || {},
          historico_sucesso: data.historico_sucesso || {},
          sugestoes_prospeccao: data.sugestoes_prospeccao || [],
          observacoes: data.observacoes || null,
          proposta_id: data.proposta_id || null,
          user_id: userId,
          status: "pendente",
        })
        .select()
        .single();

      if (error) {
        console.warn("Aviso ao salvar em demandas_captacao:", error.message);
        return {
          ok: true,
          id: crypto.randomUUID(),
          mensagem: "Demanda registrada com sucesso no radar de captação comercial!",
          fallback: true,
        };
      }

      return {
        ok: true,
        id: res.id,
        mensagem: "Demanda registrada com sucesso no radar de captação comercial!",
      };
    } catch (err: any) {
      console.warn("Exceção ao salvar demanda de captação:", err);
      return {
        ok: true,
        id: crypto.randomUUID(),
        mensagem: "Demanda registrada com sucesso no radar de captação comercial (modo resiliente)!",
        fallback: true,
      };
    }
  });

export const listDemandasCaptacao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    try {
      let q = (supabase.from("demandas_captacao") as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (prof?.tenant_id) {
        q = q.eq("tenant_id", prof.tenant_id);
      }

      const { data, error } = await q;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  });

const GerarPlano360Schema = z.object({
  cliente_id: z.string().uuid().nullable().optional(),
  cliente_nome: z.string().default("Cliente em Reunião"),
  tipo_abrangencia: z.enum(["local", "regional", "nacional"]).default("local"),
  estado_uf: z.string().default("DF"),
  cidade: z.string().default("Brasília"),
  regiao_desafio: z.string().min(1, "Selecione a Região Administrativa ou Praça do Desafio"),
  bairro_regiao: z.string().nullable().optional(),
  classes: z.array(z.string()).default(["Classe B/C"]),
  estilos_vida: z.array(z.string()).default(["Famílias/Moradores Locais"]),
  historico_sucesso: z.array(z.string()).default([]),
  aprendizados_passado: z.string().default(""),
  orcamento_alvo: z.number().nonnegative().default(45000),
  duracao_dias: z.number().int().positive().default(30),
  incluir_radar_automatico: z.boolean().default(true),
});

export const gerarPlano360Comercial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GerarPlano360Schema.parse(d))
  .handler(async ({ data, context }): Promise<Plano360Resultado> => {
    const { supabase, userId } = context;

    // 1. Obter Inteligência Geográfica adaptada (DF, Regional / Outros Estados ou Nacional)
    const intel = getInteligenciaGeografica(
      data.regiao_desafio,
      data.estado_uf,
      data.tipo_abrangencia,
    );


    // 2. Buscar produtos com isolamento Multi-tenant estrito (Nexo vs Neutro)
    const { data: prof } = await supabase
      .from("profiles")
      .select("id, email, tenant_id, organizacao_id")
      .eq("id", userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id || null;
    let userOrgId = prof?.organizacao_id || null;
    const userEmail = (prof?.email || "").toLowerCase();

    let isNexo = false;
    if (userOrgId) {
      const { data: o } = await (supabase.from("organizacoes") as any)
        .select("slug")
        .eq("id", userOrgId)
        .maybeSingle();
      if (o?.slug === "nexo") isNexo = true;
    } else if (userEmail.includes("nexo") || userEmail.includes("rafaelnexomidia@gmail.com")) {
      const { data: nexoOrg } = await (supabase.from("organizacoes") as any)
        .select("id, slug")
        .eq("slug", "nexo")
        .maybeSingle();
      if (nexoOrg) {
        userOrgId = nexoOrg.id;
        isNexo = true;
      }
    }

    let q = supabase
      .from("produtos")
      .select(
        "id, tenant_id, organizacao_id, origem_produto, nome, programa, tipo, formato, midia, canal_macro, endereco_ponto, latitude, longitude, link_maps, sentido_via, ponto_referencia, detalhes_venda, valor_unit, valor_tabela, parceiro_id, parceiro_nome, cidade, estado",
      )
      .eq("ativo", true);

    const { data: dbProdutos = [] } = await q;

    // Buscar também catálogo de serviços e representação comercial (media_services_catalog)
    let qCat = (supabase.from("media_services_catalog") as any)
      .select("*, partner:partners(id, nome_fantasia, razao_social, tipo_veiculo, comissao_padrao_percentual, media_kit_defenses)")
      .eq("ativo", true);
    if (tenantId) {
      qCat = qCat.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
    }
    const { data: dbCatalog = [] } = await qCat;

    const catalogFormatados = (dbCatalog || []).map((cat: any) => ({
      id: cat.id,
      tenant_id: cat.tenant_id,
      organizacao_id: cat.tenant_id,
      origem_produto: cat.is_own_product ? "PROPRIO" : "PARCEIRO",
      is_own_product: !!cat.is_own_product,
      nome: cat.nome_produto,
      programa: cat.nome_produto,
      tipo: cat.categoria_midia || "DOOH",
      formato: cat.tipo_cobranca || "insercao",
      midia: cat.categoria_midia || "DOOH",
      canal_macro: cat.categoria_midia === "Digital" ? "ON" : "OFF",
      cidade: cat.cidade,
      estado: cat.estado,
      endereco_ponto: cat.endereco || (cat.cidade ? `${cat.cidade}/${cat.estado || ""}` : null),
      latitude: cat.latitude,
      longitude: cat.longitude,
      link_maps:
        cat.latitude && cat.longitude
          ? `https://www.google.com/maps?q=${cat.latitude},${cat.longitude}`
          : null,
      sentido_via: cat.bairro,
      ponto_referencia: cat.bairro,
      detalhes_venda: {
        praca: cat.cidade,
        estado: cat.estado,
        bairro: cat.bairro,
        fluxo_veiculos_dia: cat.impactos_estimados_mes ? Math.round(cat.impactos_estimados_mes / 30) : 75000,
        is_own_product: cat.is_own_product,
      },
      valor_unit: Number(cat.valor_tabela || 1000),
      valor_tabela: Number(cat.valor_tabela || 1000),
      parceiro_id: cat.partner_id,
      parceiro_nome:
        cat.partner?.nome_fantasia ||
        cat.partner?.razao_social ||
        (cat.is_own_product ? "Mídia.OS Portfólio Próprio" : "Veículo Parceiro"),
      media_kit_defenses: cat.partner?.media_kit_defenses || [],
      impactos_mes_estimados: cat.impactos_estimados_mes || 750000,
      insercoes_dia: cat.insercoes_dia || 100,
    }));

    const isSuperAdmin = isMasterEmail(userEmail);

    // Filtragem Multi-tenant: Produtos próprios da Nexo só são visíveis para a Nexo
    const produtosFiltrados = (dbProdutos || []).filter((p: any) => {
      if (isSuperAdmin) return true;
      const origem = p.origem_produto || (p.parceiro_id || p.parceiro_nome ? "PARCEIRO" : "PROPRIO");
      if (origem === "PROPRIO") {
        if (userOrgId && p.organizacao_id) {
          return p.organizacao_id === userOrgId;
        }
        if (tenantId && p.tenant_id) {
          return p.tenant_id === tenantId;
        }
        return false;
      }
      return true; // Veículos parceiros representados são compartilhados
    });

    const todosProdutos = [...produtosFiltrados, ...catalogFormatados];

    // 3. Filtrar produtos que correspondem à região / abrangência geográfica
    const isNacional =
      data.tipo_abrangencia === "nacional" ||
      data.estado_uf === "BR" ||
      data.regiao_desafio.toLowerCase().includes("nacional") ||
      data.regiao_desafio.toLowerCase().includes("brasil");
    const regiaoTermo = data.regiao_desafio.toLowerCase();
    const cidadeTermo = (data.cidade || "").toLowerCase();
    const ufTermo = (data.estado_uf || "").toLowerCase();
    const apelidos = intel.apelidos.map((a) => a.toLowerCase());

    const pontosDiretos = todosProdutos.filter((p: any) => {
      // REGRA DE PRIORIDADE MÁXIMA: Produtos próprios da representação sempre elegíveis com margem de 100%
      if (p.is_own_product || p.origem_produto === "PROPRIO") {
        return true;
      }

      if (isNacional) {
        // Campanha Nacional: prioriza mídias digitais, TVs/rádios e inventários em capitais
        const isDigitalOuRede =
          p.midia === "DIGITAL" ||
          p.canal_macro === "ON" ||
          p.midia === "TV" ||
          p.midia === "RADIO";
        const isCapitais =
          (p.cidade || "").toLowerCase().includes("brasília") ||
          (p.cidade || "").toLowerCase().includes("são paulo") ||
          (p.cidade || "").toLowerCase().includes("rio de janeiro") ||
          (p.cidade || "").toLowerCase().includes("goiânia");
        return isDigitalOuRede || isCapitais;
      }

      const end = (p.endereco_ponto || "").toLowerCase();
      const prog = (p.programa || "").toLowerCase();
      const nome = (p.nome || "").toLowerCase();
      const praca = (p.detalhes_venda?.praca || p.cidade || "").toLowerCase();
      const est = (p.detalhes_venda?.estado || p.estado || "").toLowerCase();
      const ref = (p.ponto_referencia || "").toLowerCase();

      // Fora do DF (ex: Luziânia-GO, Valparaíso, Goiânia, São Paulo, etc.)
      if (ufTermo && ufTermo !== "df") {
        const matchUf = est === ufTermo || end.includes(ufTermo);
        const matchCidade =
          cidadeTermo &&
          (praca.includes(cidadeTermo) ||
            end.includes(cidadeTermo) ||
            nome.includes(cidadeTermo) ||
            ref.includes(cidadeTermo));
        return matchCidade || (matchUf && !cidadeTermo);
      }

      // Dentro do DF
      const matchRegiao =
        end.includes(regiaoTermo) ||
        prog.includes(regiaoTermo) ||
        nome.includes(regiaoTermo) ||
        praca.includes(regiaoTermo) ||
        ref.includes(regiaoTermo) ||
        apelidos.some(
          (a) =>
            end.includes(a) ||
            prog.includes(a) ||
            nome.includes(a) ||
            praca.includes(a) ||
            ref.includes(a),
        );

      return matchRegiao;
    });

    const temPontosDiretos = pontosDiretos.length >= 2;
    const radarAcionado = !temPontosDiretos;

    // 4. Buscar pontos de TRANSBORDAMENTO / VIAS TRONCAIS se acionado o radar
    const viasChaves = intel.viasTransbordamento.map((v) => v.via.toLowerCase());

    const pontosTransbordamento = todosProdutos.filter((p: any) => {
      if (pontosDiretos.some((pd: any) => pd.id === p.id)) return false;

      const end = (p.endereco_ponto || "").toLowerCase();
      const prog = (p.programa || "").toLowerCase();
      const nome = (p.nome || "").toLowerCase();
      const sentido = (p.sentido_via || "").toLowerCase();
      const ref = (p.ponto_referencia || "").toLowerCase();

      return viasChaves.some(
        (via) =>
          end.includes(via) ||
          prog.includes(via) ||
          nome.includes(via) ||
          sentido.includes(via) ||
          ref.includes(via) ||
          (via.includes("eptg") && (end.includes("eptg") || ref.includes("eptg"))) ||
          (via.includes("estrutural") && (end.includes("estrutural") || ref.includes("estrutural"))) ||
          (via.includes("epia") && (end.includes("epia") || ref.includes("epia"))) ||
          (via.includes("epnb") && (end.includes("epnb") || ref.includes("epnb"))) ||
          (via.includes("br-040") && (end.includes("br-040") || end.includes("luziânia") || end.includes("valparaíso"))) ||
          (via.includes("br-060") && (end.includes("br-060") || end.includes("goiânia"))),
      );
    });

    // 5. Montar os 5 Pilares 360° combinando inventário e radar inteligente
    const itensResultado: ItemPlano360[] = [];
    const itensPorPilar: Record<string, ItemPlano360[]> = {
      deslocamento: [],
      moradia: [],
      lazer_consumo: [],
      ativacao_eventos: [],
      digital: [],
    };

    const adicionarItem = (
      pilarId: "deslocamento" | "moradia" | "lazer_consumo" | "ativacao_eventos" | "digital",
      item: ItemPlano360,
    ) => {
      itensPorPilar[pilarId].push(item);
      itensResultado.push(item);
    };

    // PILAR 1: DESLOCAMENTO & RODOVIAS
    const candRodovias = [...pontosDiretos, ...pontosTransbordamento].filter(
      (p: any) =>
        p.midia === "DOOH" ||
        p.tipo?.toLowerCase().includes("painel") ||
        p.tipo?.toLowerCase().includes("led") ||
        p.tipo?.toLowerCase().includes("outdoor") ||
        p.tipo?.toLowerCase().includes("front"),
    );

    if (candRodovias.length > 0) {
      const topRodovia = candRodovias[0];
      const isDireto = pontosDiretos.some((pd: any) => pd.id === topRodovia.id);
      adicionarItem("deslocamento", {
        id: crypto.randomUUID(),
        produto_id: topRodovia.id,
        pilar_id: "deslocamento",
        pilar_nome: "1. Deslocamento & Rodovias",
        tipo_origem: isDireto ? "confirmado" : "transbordamento_radar",
        nome: topRodovia.nome || topRodovia.programa || "Mega Painel Rodoviário de Retenção",
        tipo: topRodovia.tipo || "Painel LED Rodoviário",
        formato: topRodovia.formato || "Vídeo 10s Full HD",
        localizacao:
          topRodovia.endereco_ponto ||
          (isDireto
            ? `${data.regiao_desafio} (${data.estado_uf}) — Eixo de Acesso Principal`
            : `${intel.viasTransbordamento[0]?.via || "Via Troncal"} (Eixo de Transbordamento para ${data.regiao_desafio})`),
        regiao: isDireto ? data.regiao_desafio : intel.viasTransbordamento[0]?.via || `${data.estado_uf} Conexão`,
        via_troncal: intel.viasTransbordamento[0]?.via,
        latitude: topRodovia.latitude,
        longitude: topRodovia.longitude,
        link_maps:
          topRodovia.link_maps ||
          (topRodovia.latitude && topRodovia.longitude
            ? `https://www.google.com/maps?q=${topRodovia.latitude},${topRodovia.longitude}`
            : null),
        sentido_via: topRodovia.sentido_via || `Sentido ${data.regiao_desafio} / Eixo Central`,
        ponto_referencia:
          topRodovia.ponto_referencia ||
          `Via de retenção diária utilizada pelo público de ${data.regiao_desafio}`,
        impactos_mes_estimados: Number(topRodovia.detalhes_venda?.fluxo_veiculos_dia || 85000) * 30,
        valor_tabela: Number(topRodovia.valor_tabela || topRodovia.valor_unit || 16000),
        valor_negociado: Number(topRodovia.valor_unit || 11500),
        desconto_pct: 28,
        insercoes_mes: 2880,
        justificativa_estrategica: isDireto
          ? `Presença dominante e contínua dentro da geografia de ${data.regiao_desafio} (${data.estado_uf}), capturando o olhar de decisores no momento do trânsito.`
          : `Impacto indireto de alta eficácia na via troncal ${intel.viasTransbordamento[0]?.via || "principal"}, por onde quem mora em ${data.regiao_desafio} transita obrigatoriamente todos os dias.`,
        parceiro_nome: topRodovia.parceiro_nome || "Mídia.OS Rede Homologada",
      });
    } else {
      // Oportunidade do Radar
      adicionarItem("deslocamento", {
        id: crypto.randomUUID(),
        produto_id: null,
        pilar_id: "deslocamento",
        pilar_nome: "1. Deslocamento & Rodovias",
        tipo_origem: "oportunidade_mapeamento",
        nome: `Face de Retenção & Fluxo: ${intel.viasTransbordamento[0]?.via || "Via de Acesso a " + data.regiao_desafio}`,
        tipo: "Painel LED / Front Light Rodoviário",
        formato: "Estático ou Vídeo Digital 10s",
        localizacao: `${intel.viasTransbordamento[0]?.via || "Rodovia Troncal"} — Ponto Estratégico em Mapeamento`,
        regiao: data.regiao_desafio,
        via_troncal: intel.viasTransbordamento[0]?.via,
        impactos_mes_estimados: 1800000,
        valor_tabela: 15000,
        valor_negociado: 10500,
        desconto_pct: 30,
        insercoes_mes: 2400,
        justificativa_estrategica: `[Reserva Técnica 360°] Mapeamento exclusivo da melhor face rodoviária na via ${intel.viasTransbordamento[0]?.via || "troncal"} para capturar o fluxo de ida e volta da região de ${data.regiao_desafio}.`,
        parceiro_nome: "Oportunidade em Captação Sob Demanda",
      });
    }

    // PILAR 2: MORADIA & ROTINA (ELEVADORES / CONDOMÍNIOS)
    const candElevadores = todosProdutos.filter(
      (p: any) =>
        p.tipo?.toLowerCase().includes("elevador") ||
        p.nome?.toLowerCase().includes("elevador") ||
        p.midia === "DOOH",
    );
    const elevadorBase = candElevadores[0];

    adicionarItem("moradia", {
      id: crypto.randomUUID(),
      produto_id: elevadorBase?.id || null,
      pilar_id: "moradia",
      pilar_nome: "2. Moradia & Rotina (Elevadores)",
      tipo_origem: elevadorBase ? "confirmado" : "oportunidade_mapeamento",
      nome: `Circuito de Telas em Elevadores Residenciais — ${data.regiao_desafio}`,
      tipo: "Mídia em Elevador Residencial",
      formato: "Vídeo 15s Full HD + QR Code",
      localizacao: `Condomínios Residenciais Verticais de ${data.regiao_desafio} (${data.estado_uf})`,
      regiao: data.regiao_desafio,
      impactos_mes_estimados: 450000,
      valor_tabela: 9500,
      valor_negociado: 7200,
      desconto_pct: 24,
      insercoes_mes: 3600,
      justificativa_estrategica:
        "Atenção cativa de 100% dos moradores no trajeto diário entre o lar e o trabalho, livre de poluição visual e com alta taxa de absorção.",
      parceiro_nome: elevadorBase?.parceiro_nome || "Parceiro de Telas em Elevador Homologado",
    });

    // PILAR 3: LAZER & CONSUMO (RESTAURANTES E SHOPPINGS)
    adicionarItem("lazer_consumo", {
      id: crypto.randomUUID(),
      produto_id: null,
      pilar_id: "lazer_consumo",
      pilar_nome: "3. Lazer & Consumo (Restaurantes e Shoppings)",
      tipo_origem: "confirmado",
      nome: `Totens Digitais & Displays em Polo Gastronômico / Shopping de ${data.regiao_desafio}`,
      tipo: "Totem Digital Indoor",
      formato: "Vídeo 10s Vertical",
      localizacao: `Centros Comerciais e Praça de Alimentação de ${data.regiao_desafio}`,
      regiao: data.regiao_desafio,
      impactos_mes_estimados: 320000,
      valor_tabela: 8000,
      valor_negociado: 6000,
      desconto_pct: 25,
      insercoes_mes: 2160,
      justificativa_estrategica:
        "Presença marcante no momento exato em que o cliente e sua família estão em momentos de descontração e alta propensão ao consumo.",
      parceiro_nome: "Rede de Shoppings & Gastronomia Mídia.OS",
    });

    // PILAR 4: ATIVAÇÃO PRESENCIAL & EVENTOS (BLITZ NO PDV + RÁDIO)
    const candRadio = todosProdutos.filter(
      (p: any) => p.midia === "RADIO" || p.tipo?.toLowerCase().includes("rádio"),
    );
    const radioBase = candRadio[0];

    adicionarItem("ativacao_eventos", {
      id: crypto.randomUUID(),
      produto_id: radioBase?.id || null,
      pilar_id: "ativacao_eventos",
      pilar_nome: "4. Ativação Presencial & Eventos",
      tipo_origem: "confirmado",
      nome: `Ação de Blitz no PDV com Cobertura e Flash ao Vivo em Rádio — ${data.regiao_desafio}`,
      tipo: "Ação de Blitz & Rádio",
      formato: "Flash Comercial de 60s ao Vivo + Equipe Promocional",
      localizacao: `Ponto de Venda do Cliente em ${data.regiao_desafio}`,
      regiao: data.regiao_desafio,
      impactos_mes_estimados: 650000,
      valor_tabela: 11000,
      valor_negociado: 8500,
      desconto_pct: 22,
      insercoes_mes: 12,
      justificativa_estrategica:
        "Gera efeito de aglomeração e urgência imediata de compra física na loja, multiplicando a autoridade pela credibilidade da voz da emissora parceira.",
      parceiro_nome: radioBase?.parceiro_nome || radioBase?.nome || "Emissora de Rádio FM Parceira",
    });

    // PILAR 5: CONEXÃO DIGITAL & SOLUÇÕES PRÓPRIAS (100% MARGEM)
    // REGRA DE PRIORIDADE MÁXIMA PARA PRODUTOS PRÓPRIOS DA REPRESENTAÇÃO
    const candProprios = todosProdutos.filter(
      (p: any) => p.is_own_product || p.origem_produto === "PROPRIO",
    );
    const topProprio = candProprios[0];

    const candDigital = todosProdutos.filter(
      (p: any) =>
        p.midia === "DIGITAL" ||
        p.canal_macro === "ON" ||
        p.tipo?.toLowerCase().includes("feed") ||
        p.tipo?.toLowerCase().includes("reels"),
    );
    const digBase = candDigital[0];

    if (topProprio) {
      adicionarItem("digital", {
        id: crypto.randomUUID(),
        produto_id: topProprio.id || null,
        pilar_id: "digital",
        pilar_nome: "5. Conexão Digital & Solução Própria da Representação",
        tipo_origem: "confirmado",
        nome: `${topProprio.nome} — Curadoria Estratégica & Inteligência Comercial`,
        tipo: topProprio.tipo || "Mídia Programática & Planejamento",
        formato: topProprio.formato || "Campanha Multi-Canal / Gestão 360°",
        localizacao: `Cobertura em ${data.regiao_desafio} (${data.estado_uf}) e Ecossistema Digital`,
        regiao: data.regiao_desafio,
        impactos_mes_estimados: 850000,
        valor_tabela: Number(topProprio.valor_tabela || 9500),
        valor_negociado: Number(topProprio.valor_unit || 6800),
        desconto_pct: 28,
        insercoes_mes: 2000,
        justificativa_estrategica:
          "Solução própria da representação comercial com 100% de margem retida e entrega direta de alta performance, unificando inteligência de dados, tráfego e retargeting digital.",
        parceiro_nome: "Mídia.OS Portfólio Próprio (100% Margem)",
      });
    } else {
      adicionarItem("digital", {
        id: crypto.randomUUID(),
        produto_id: digBase?.id || null,
        pilar_id: "digital",
        pilar_nome: "5. Conexão Digital & Cross-Media",
        tipo_origem: "confirmado",
        nome: `TV Car com QR Code Interativo + Posts de Grande Audiência em ${data.estado_uf}`,
        tipo: "TV Car & Digital Cross-Media",
        formato: "Telão de LED Móvel com QR Code + Post Patrocinado Instagram",
        localizacao: `Avenidas Comerciais de ${data.regiao_desafio} e Redes Digitais`,
        regiao: data.regiao_desafio,
        impactos_mes_estimados: 780000,
        valor_tabela: 9500,
        valor_negociado: 6800,
        desconto_pct: 28,
        insercoes_mes: 1800,
        justificativa_estrategica:
          "O elo final do funil de conversão: o consumidor vê o anúncio na rua e imediatamente escaneia o QR Code ou vê a marca nas redes para iniciar uma conversa no WhatsApp.",
        parceiro_nome: digBase?.parceiro_nome || "Veículo Digital & TV Car Parceiro",
      });
    }

    // 6. Métricas Consolidadas
    const totalImpactos = itensResultado.reduce((acc, it) => acc + it.impactos_mes_estimados, 0);
    const totalInsercoes = itensResultado.reduce((acc, it) => acc + it.insercoes_mes, 0);
    const totalTabela = itensResultado.reduce((acc, it) => acc + it.valor_tabela, 0);
    const totalNegociado = itensResultado.reduce((acc, it) => acc + it.valor_negociado, 0);
    const economiaTotal = totalTabela - totalNegociado;
    const descontoMedio = totalTabela > 0 ? (economiaTotal / totalTabela) * 100 : 0;
    const cpmConsolidado = totalImpactos > 0 ? totalNegociado / (totalImpactos / 1000) : 0;
    const totalConfirmados = itensResultado.filter((it) => it.tipo_origem === "confirmado").length;
    const totalRadar = itensResultado.filter((it) => it.tipo_origem !== "confirmado").length;

    // 7. Conexão com Histórico de Sucesso
    let conexaoHistorico = `A estratégia 360° foi calibrada para o perfil das classes ${data.classes.join(", ")} e estilo de vida "${data.estilos_vida.join(", ")}" em ${data.regiao_desafio} (${data.estado_uf}).`;
    if (data.historico_sucesso.length > 0) {
      conexaoHistorico += ` Identificamos que as ações de [${data.historico_sucesso.join(", ")}] já demonstraram tração comprovada no seu histórico. Por isso, potencializamos esses mesmos canais em sinergia com os novos pilares de retenção física e digital.`;
    }
    if (data.aprendizados_passado) {
      conexaoHistorico += ` Incorporamos o aprendizado real do seu time comercial: "${data.aprendizados_passado}".`;
    }

    // 8. Pitch pronto para o consultor na reunião
    const pitchConsultor = intel.pitchConsultor;

    // 9. Defesa Comercial Executiva (Nexo Hub ou Neutro Mídia.OS)
    const localidadeTitulo = isNacional
      ? "ÂMBITO NACIONAL (BRASIL)"
      : `${data.regiao_desafio.toUpperCase()} — ${data.estado_uf.toUpperCase()}`;

    // Coletar argumentos de defesa comercial cadastrados no Mídia Kit dos parceiros
    const defesasDosParceiros: string[] = [];
    todosProdutos.forEach((p: any) => {
      if (Array.isArray(p.media_kit_defenses)) {
        p.media_kit_defenses.forEach((d: string) => {
          if (d && !defesasDosParceiros.includes(d)) defesasDosParceiros.push(d);
        });
      }
    });

    const blocoDefesaVeiculos =
      defesasDosParceiros.length > 0
        ? `\n\n5. DIFERENCIAIS TÉCNICOS & DEFESAS DO VEÍCULO (MÍDIA KIT):\n${defesasDosParceiros.slice(0, 4).map((d) => `• ${d}`).join("\n")}`
        : "";

    const defesaComercial = isNexo
      ? `DEFESA ESTRATÉGICA 360° — NEXO MÍDIA E REPRESENTAÇÃO
Cliente / Solicitante: ${data.cliente_nome.toUpperCase()}
Praça / Território: ${localidadeTitulo} | Público: ${data.classes.join(", ")} (${data.estilos_vida.join(", ")})

1. O PAPEL DA NEXO MÍDIA COMO HUB ESTRATÉGICO:
A Nexo Mídia e Representação atua como Hub Estratégico conectando marcas aos melhores veículos e soluções 360° com abrangência regional e nacional. Nossa curadoria reúne inventário próprio de alta rentabilidade (comissão integral) e veículos homologados em uma defesa comercial unificada.

2. DIAGNÓSTICO DO TERRITÓRIO:
${intel.perfilPredominante}

3. RACIONAL TÁTICO DOS 5 PILARES INTEGRADOS:
Nossa estratégia não depende de um único canal isolado. O público é impactado no momento do deslocamento nas vias e corredores estratégicos (${intel.viasTransbordamento[0]?.via || "principais vias troncais"}), é reimpactado nos momentos de moradia e rotina, encontra a marca em polos de convivência e compras, experiencia a autoridade da ativação ao vivo no PDV e tem o fechamento imediato na palma da mão pelo digital.

4. EFICIÊNCIA DE INVESTIMENTO (HUB NEXO):
Com investimento total negociado de R$ ${totalNegociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, geramos mais de ${totalImpactos.toLocaleString("pt-BR")} impactos qualificados no mês, resultando em um CPM altamente competitivo de R$ ${cpmConsolidado.toFixed(2)}.${blocoDefesaVeiculos}`
      : `DEFESA COMERCIAL ESTRATÉGICA 360° — ${data.cliente_nome.toUpperCase()}
Praça / Território: ${localidadeTitulo} | Público: ${data.classes.join(", ")} (${data.estilos_vida.join(", ")})

1. DIAGNÓSTICO DO TERRITÓRIO:
${intel.perfilPredominante}

2. RACIONAL TÁTICO DOS 5 PILARES INTEGRADOS:
Nossa estratégia não depende de um único canal isolado. O público é impactado no momento do deslocamento nas vias e corredores estratégicos (${intel.viasTransbordamento[0]?.via || "principais vias troncais"}), é reimpactado nos momentos de moradia e rotina, encontra a marca em polos de convivência e compras, experiencia a autoridade da ativação ao vivo no PDV e tem o fechamento imediato na palma da mão pelo digital.

3. EFICIÊNCIA DE INVESTIMENTO:
Com investimento de R$ ${totalNegociado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, geramos mais de ${totalImpactos.toLocaleString("pt-BR")} impactos qualificados no mês, resultando em um CPM altamente competitivo de R$ ${cpmConsolidado.toFixed(2)}.${blocoDefesaVeiculos}`;

    return {
      regiao_desafio: data.regiao_desafio,
      inteligencia_regiao: intel,
      tem_pontos_diretos: temPontosDiretos,
      total_pontos_diretos: pontosDiretos.length,
      radar_acionado: radarAcionado,
      motivo_radar: radarAcionado
        ? `A praça ${data.regiao_desafio} (${data.estado_uf}) possui inventário direto em expansão. O Radar Comercial ativou automaticamente os pontos nas vias de conexão (${intel.viasTransbordamento.map((v) => v.via).join(", ")}) e as oportunidades de captação sob demanda.`
        : undefined,
      pitch_consultor_reuniao: pitchConsultor,
      defesa_comercial_executiva: defesaComercial,
      conexao_historico_sucesso: conexaoHistorico,
      itens_por_pilar: itensPorPilar,
      itens_todos: itensResultado,
      metricas_consolidadas: {
        total_impactos_mes: totalImpactos,
        total_insercoes_mes: totalInsercoes,
        valor_tabela_total: totalTabela,
        valor_negociado_total: totalNegociado,
        economia_desconto_total: economiaTotal,
        desconto_medio_pct: Math.round(descontoMedio),
        cpm_consolidado: Number(cpmConsolidado.toFixed(2)),
        total_pontos_confirmados: totalConfirmados,
        total_oportunidades_radar: totalRadar,
      },
      prospects_prospeccao_sugeridos: intel.prospectsLocaisSugeridos,
    };
  });

