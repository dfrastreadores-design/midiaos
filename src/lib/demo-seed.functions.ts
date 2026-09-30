import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Popula dados fictícios para uma conta demo (48h de trial).
 * Cada perfil de teste recebe seu próprio tenant isolado com dados em
 * todos os módulos que o perfil "teste" tem acesso. Idempotente.
 */
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (
      input:
        | {
            cnpj?: string;
            razao_social?: string;
            nome_fantasia?: string;
            contato_nome?: string;
            contato_email?: string;
            contato_whatsapp?: string;
          }
        | undefined,
    ) => input ?? {},
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id, email, nome")
      .eq("id", userId)
      .maybeSingle();

    let tenantId = profile?.tenant_id ?? null;
    let tenantIsDemo = false;
    if (tenantId) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("plano,status")
        .eq("id", tenantId)
        .maybeSingle();
      tenantIsDemo = t?.plano === "demo" || t?.status === "trial";
    }
    const tenantInfo = {
      razao_social:
        data.razao_social || `[DEMO] ${profile?.nome ?? profile?.email ?? "Conta de teste"}`,
      nome_fantasia: data.nome_fantasia || "Conta Demo",
      cnpj: data.cnpj ?? null,
      contato_nome: data.contato_nome ?? profile?.nome ?? null,
      contato_email: data.contato_email ?? profile?.email ?? null,
      contato_whatsapp: data.contato_whatsapp ?? null,
    };
    if (!tenantId || !tenantIsDemo) {
      const { data: novo } = await supabaseAdmin
        .from("tenants")
        .insert({ ...tenantInfo, plano: "demo", status: "trial" } as never)
        .select("id")
        .single();
      tenantId = novo?.id ?? null;
      if (tenantId) {
        await supabaseAdmin.from("profiles").update({ tenant_id: tenantId }).eq("id", userId);
      }
    } else if (tenantId) {
      await supabaseAdmin
        .from("tenants")
        .update(tenantInfo as never)
        .eq("id", tenantId);
    }

    // Idempotência
    const { count } = await supabaseAdmin
      .from("clientes")
      .select("id", { count: "exact", head: true })
      .eq("created_by", userId);
    if ((count ?? 0) > 0) return { ok: true, skipped: true };

    const today = new Date();
    const iso = (d: Date) => d.toISOString();
    const isoDate = (d: Date) => d.toISOString().slice(0, 10);
    const addDays = (base: Date, days: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + days);
      return d;
    };

    // ---- Clientes (20)
    const segmentos = [
      "Alimentação",
      "Automotivo",
      "Educação",
      "Saúde",
      "Varejo",
      "Imobiliário",
      "Turismo",
      "Serviços",
      "Moda",
      "Tecnologia",
    ];
    const cidades: Array<[string, string]> = [
      ["São Paulo", "SP"],
      ["Rio de Janeiro", "RJ"],
      ["Brasília", "DF"],
      ["Goiânia", "GO"],
      ["Belo Horizonte", "MG"],
      ["Curitiba", "PR"],
      ["Salvador", "BA"],
      ["Fortaleza", "CE"],
      ["Porto Alegre", "RS"],
      ["Recife", "PE"],
    ];
    const nomesClientes = [
      "Padaria Pão Quente",
      "AutoCenter Veloz",
      "Faculdade Horizonte",
      "Clínica Vida Plena",
      "Supermercado Bom Preço",
      "Construtora Alicerce",
      "Turismo Mar Azul",
      "Contabilidade Prisma",
      "Moda Estilo Já",
      "Tech Nuvem Digital",
      "Ótica Visão Clara",
      "Restaurante Sabor & Cia",
      "Farmácia Saúde Total",
      "Academia Movimento",
      "Pet Shop Amigo Fiel",
      "Escola Sementinha",
      "Hotel Mirante",
      "Loja de Móveis Conforto",
      "Concessionária Norte",
      "Distribuidora Central",
    ];
    const clientesPayload = nomesClientes.map((nome, i) => {
      const [cidade, uf] = cidades[i % cidades.length];
      return {
        razao_social: `[DEMO] ${nome} LTDA`,
        nome_fantasia: nome,
        segmento: segmentos[i % segmentos.length],
        cidade,
        uf,
        status: "ativo",
        created_by: userId,
        executivo_id: userId,
        tenant_id: tenantId,
        contatos: [
          {
            nome: `Contato ${i + 1} Demo`,
            email: `contato${i + 1}@demo.exemplo`,
            telefone: `(${11 + (i % 80)}) 90000-${String(1000 + i).padStart(4, "0")}`,
          },
        ],
      };
    });
    const { data: clientesIns } = await supabaseAdmin
      .from("clientes")
      .insert(clientesPayload as never)
      .select("id, razao_social, segmento");
    const cli = (clientesIns ?? []) as { id: string; razao_social: string; segmento: string }[];

    // ---- Agências (5)
    const agenciasPayload = [
      {
        nome_fantasia: "Ideias Publicidade",
        razao_social: "Agência Criativa Ideias LTDA",
        cidade: "São Paulo",
        uf: "SP",
      },
      {
        nome_fantasia: "BrandLab",
        razao_social: "BrandLab Comunicação S/A",
        cidade: "Rio de Janeiro",
        uf: "RJ",
      },
      {
        nome_fantasia: "Trend Studio",
        razao_social: "Trend Studio Marketing LTDA",
        cidade: "Belo Horizonte",
        uf: "MG",
      },
      {
        nome_fantasia: "Ponto Alto",
        razao_social: "Ponto Alto Propaganda LTDA",
        cidade: "Curitiba",
        uf: "PR",
      },
      {
        nome_fantasia: "Mídia Norte",
        razao_social: "Mídia Norte Comunicação LTDA",
        cidade: "Fortaleza",
        uf: "CE",
      },
    ].map((a, i) => ({
      razao_social: `[DEMO] ${a.razao_social}`,
      nome_fantasia: a.nome_fantasia,
      cidade: a.cidade,
      uf: a.uf,
      status: "ativo",
      created_by: userId,
      executivo_id: userId,
      tenant_id: tenantId,
      contatos: [
        {
          nome: `Agência Contato ${i + 1}`,
          email: `ag${i + 1}@demo.exemplo`,
          telefone: `(11) 91000-${String(1000 + i).padStart(4, "0")}`,
        },
      ],
    }));
    await supabaseAdmin.from("agencias").insert(agenciasPayload as never);

    // ---- Emissoras / Fornecedores (6)
    const { data: emissorasIns } = await supabaseAdmin
      .from("emissoras")
      .insert([
        {
          nome: "[DEMO] TV Aurora",
          razao_social: "TV Aurora Demo LTDA",
          tipo_midia: "tv",
          cidade: "São Paulo",
          uf: "SP",
          comissao_padrao_pct: 20,
          tenant_id: tenantId,
        },
        {
          nome: "[DEMO] TV Horizonte",
          razao_social: "TV Horizonte Demo LTDA",
          tipo_midia: "tv",
          cidade: "Rio de Janeiro",
          uf: "RJ",
          comissao_padrao_pct: 20,
          tenant_id: tenantId,
        },
        {
          nome: "[DEMO] Rádio Cidade FM",
          razao_social: "Rádio Cidade Demo LTDA",
          tipo_midia: "radio",
          cidade: "Brasília",
          uf: "DF",
          comissao_padrao_pct: 15,
          tenant_id: tenantId,
        },
        {
          nome: "[DEMO] Rádio Sertaneja",
          razao_social: "Rádio Sertaneja Demo LTDA",
          tipo_midia: "radio",
          cidade: "Goiânia",
          uf: "GO",
          comissao_padrao_pct: 15,
          tenant_id: tenantId,
        },
        {
          nome: "[DEMO] Outdoor Metrópole",
          razao_social: "Metrópole Mídia Demo LTDA",
          tipo_midia: "ooh",
          cidade: "Belo Horizonte",
          uf: "MG",
          comissao_padrao_pct: 10,
          tenant_id: tenantId,
        },
        {
          nome: "[DEMO] Portal Notícias+",
          razao_social: "Portal Notícias Demo LTDA",
          tipo_midia: "digital",
          cidade: "Curitiba",
          uf: "PR",
          comissao_padrao_pct: 12,
          tenant_id: tenantId,
        },
      ] as never)
      .select("id, tipo_midia, nome");
    const ems = (emissorasIns ?? []) as { id: string; tipo_midia: string; nome: string }[];

    // ---- Produtos (8)
    if (ems.length > 0) {
      await supabaseAdmin.from("produtos").insert([
        {
          nome: '[DEMO] Comercial 30" - Jornal Noite',
          midia: "tv",
          tipo_midia: "tv",
          programa: "Jornal da Noite",
          duracao_segundos: 30,
          insercoes_padrao: 1,
          valor_unit: 3500,
          emissora_id: ems[0]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: '[DEMO] Comercial 15" - Novela',
          midia: "tv",
          tipo_midia: "tv",
          programa: "Novela das 21",
          duracao_segundos: 15,
          insercoes_padrao: 2,
          valor_unit: 2100,
          emissora_id: ems[0]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: "[DEMO] Patrocínio Esportivo",
          midia: "tv",
          tipo_midia: "tv",
          programa: "Placar Total",
          duracao_segundos: 45,
          insercoes_padrao: 1,
          valor_unit: 5200,
          emissora_id: ems[1]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: '[DEMO] Spot 30" - Rádio Manhã',
          midia: "radio",
          tipo_midia: "radio",
          programa: "Bom Dia Cidade",
          duracao_segundos: 30,
          insercoes_padrao: 1,
          valor_unit: 450,
          emissora_id: ems[2]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: '[DEMO] Spot 15" - Rádio Tarde',
          midia: "radio",
          tipo_midia: "radio",
          programa: "Show da Tarde",
          duracao_segundos: 15,
          insercoes_padrao: 3,
          valor_unit: 280,
          emissora_id: ems[3]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: "[DEMO] Outdoor Frente-loja 9x3m",
          midia: "outdoor",
          tipo_midia: "ooh",
          formato_ooh: "9x3",
          quantidade_faces: 8,
          valor_unit: 2200,
          emissora_id: ems[4]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: "[DEMO] Painel LED Rodoviária",
          midia: "outdoor",
          tipo_midia: "ooh",
          formato_ooh: "12x4",
          quantidade_faces: 4,
          valor_unit: 3400,
          emissora_id: ems[4]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
        {
          nome: "[DEMO] Banner Portal Home",
          midia: "digital",
          tipo_midia: "digital",
          duracao_segundos: 0,
          insercoes_padrao: 100000,
          valor_unit: 12,
          emissora_id: ems[5]?.id,
          tenant_id: tenantId,
          created_by: userId,
        },
      ] as never);
    }

    // ---- Propostas (8)
    if (cli.length >= 8) {
      const stAtual = [
        "rascunho",
        "enviada",
        "aprovada",
        "enviada",
        "aprovada",
        "rascunho",
        "enviada",
        "aprovada",
      ];
      const propostasPayload = Array.from({ length: 8 }).map((_, i) => ({
        numero: "",
        cliente_id: cli[i].id,
        campanha: `[DEMO] Campanha ${cli[i].razao_social.replace("[DEMO] ", "").split(" ")[0]} ${today.getFullYear()}`,
        status: stAtual[i],
        valor_tabela: 30000 + i * 7500,
        valor_desconto: 3000 + i * 500,
        valor_negociado: 27000 + i * 7000,
        total_insercoes: 60 + i * 20,
        comissao_pct: 8 + (i % 4),
        created_by: userId,
        executivo_id: userId,
        tenant_id: tenantId,
      }));
      await supabaseAdmin.from("propostas").insert(propostasPayload as never);
    }

    // ---- Briefings (5)
    if (cli.length >= 5) {
      const briefs = [
        { i: 2, camp: "Vestibular 2026/1", obj: "Aumentar inscrições em 30%.", verba: 50000 },
        { i: 3, camp: "Campanha Saúde+", obj: "Divulgar check-up preventivo.", verba: 32000 },
        { i: 4, camp: "Liquidação Verão", obj: "Escoar estoque com foco em jovens.", verba: 42000 },
        { i: 6, camp: "Alta Temporada", obj: "Promover pacotes turísticos.", verba: 65000 },
        { i: 9, camp: "Lançamento Nuvem", obj: "Gerar leads B2B de tecnologia.", verba: 88000 },
      ];
      await supabaseAdmin.from("briefings").insert(
        briefs.map((b) => ({
          tipo_entidade: "cliente",
          razao_social: cli[b.i].razao_social,
          campanha: `[DEMO] ${b.camp}`,
          objetivo: b.obj,
          periodo_estimado: "próximos 60 dias",
          verba_estimada: b.verba,
          status: "pendente",
          created_by: userId,
          tenant_id: tenantId,
        })) as never,
      );
    }

    // ---- Tarefas (8)
    await supabaseAdmin.from("tarefas").insert([
      {
        user_id: userId,
        titulo: "👋 Explorar o módulo de CRM",
        descricao: "Veja os clientes demo criados.",
        status: "a_fazer",
        prioridade: "alta",
        ordem: 0,
      },
      {
        user_id: userId,
        titulo: "📝 Criar uma proposta de teste",
        descricao: "Use um cliente DEMO.",
        status: "a_fazer",
        prioridade: "media",
        ordem: 1,
      },
      {
        user_id: userId,
        titulo: "📊 Conferir dashboards",
        descricao: "Acesse Relatórios.",
        status: "fazendo",
        prioridade: "media",
        ordem: 0,
      },
      {
        user_id: userId,
        titulo: "📅 Agendar reunião com cliente",
        descricao: "Módulo Calendário.",
        status: "a_fazer",
        prioridade: "alta",
        ordem: 2,
      },
      {
        user_id: userId,
        titulo: "💼 Gerar um PI",
        descricao: "Emita um Pedido de Inserção.",
        status: "a_fazer",
        prioridade: "alta",
        ordem: 3,
      },
      {
        user_id: userId,
        titulo: "📈 Definir metas do mês",
        descricao: "Módulo Metas.",
        status: "fazendo",
        prioridade: "media",
        ordem: 1,
      },
      {
        user_id: userId,
        titulo: "🎯 Testar Projetos Especiais",
        descricao: "Explore projetos guarda-chuva.",
        status: "a_fazer",
        prioridade: "baixa",
        ordem: 4,
      },
      {
        user_id: userId,
        titulo: "✅ Concluir tour do sistema",
        descricao: "Apresentação inicial.",
        status: "concluido",
        prioridade: "baixa",
        ordem: 0,
      },
    ]);

    // ---- PIs + PI itens (5)
    if (cli.length >= 5 && ems.length >= 3) {
      const statuses = ["aprovado", "faturado", "aprovado", "enviado", "aprovado"];
      for (let i = 0; i < 5; i++) {
        const ini = new Date(today.getFullYear(), today.getMonth() - (i % 3), 1);
        const fim = new Date(ini.getFullYear(), ini.getMonth() + 1, 0);
        const emissora = ems[i % ems.length];
        const { data: piIns } = await supabaseAdmin
          .from("pis")
          .insert({
            numero: "",
            campanha: `[DEMO] Campanha ${i + 1} - ${cli[i].razao_social.replace("[DEMO] ", "")}`,
            cliente_id: cli[i].id,
            emissora_id: emissora.id,
            mes_veiculacao: ini.getMonth() + 1,
            ano_veiculacao: ini.getFullYear(),
            periodo_inicio: isoDate(ini),
            periodo_fim: isoDate(fim),
            valor_tabela: 30000 + i * 6000,
            valor_desconto: 3000 + i * 400,
            valor_negociado: 27000 + i * 5600,
            total_insercoes: 30 + i * 10,
            status: statuses[i],
            tenant_id: tenantId,
            executivo_id: userId,
            created_by: userId,
          } as never)
          .select("id")
          .single();
        if (piIns?.id) {
          await supabaseAdmin.from("pi_itens").insert([
            {
              pi_id: piIns.id,
              tipo:
                emissora.tipo_midia === "tv"
                  ? "TV"
                  : emissora.tipo_midia === "radio"
                    ? "RÁDIO"
                    : "OOH",
              programa:
                emissora.tipo_midia === "tv"
                  ? "Jornal da Noite"
                  : emissora.tipo_midia === "radio"
                    ? "Bom Dia Cidade"
                    : "Painel Central",
              insercoes_dia: 1,
              dias_semana: ["seg", "ter", "qua", "qui", "sex"],
              valor_unit: 900 + i * 120,
              valor_tabela: 30000 + i * 6000,
              valor_negociado: 27000 + i * 5600,
              total_insercoes: 30 + i * 10,
              mes: ini.getMonth() + 1,
              ano: ini.getFullYear(),
            },
          ] as never);
        }
      }
    }

    // ---- Projetos especiais (4)
    if (cli.length >= 4) {
      const projetos = [
        { nome: "Especial Fim de Ano", cli: 0, valor: 180000, meses: 3 },
        { nome: "Festival de Verão", cli: 1, valor: 240000, meses: 2 },
        { nome: "Volta às Aulas", cli: 2, valor: 160000, meses: 2 },
        { nome: "Black Friday Regional", cli: 4, valor: 210000, meses: 1 },
      ];
      await supabaseAdmin.from("projetos_especiais").insert(
        projetos.map((p) => {
          const fim = new Date();
          fim.setMonth(fim.getMonth() + p.meses);
          return {
            nome: `[DEMO] ${p.nome}`,
            descricao: "Projeto guarda-chuva com ativações em TV, rádio, OOH e digital.",
            cliente_id: cli[p.cli].id,
            responsavel_id: userId,
            comercializacao_inicio: isoDate(new Date()),
            comercializacao_fim: isoDate(fim),
            valor_estimado: p.valor,
            status: "em_comercializacao",
            tenant_id: tenantId,
            created_by: userId,
          };
        }) as never,
      );
    }

    // ---- Influenciadores (6)
    await supabaseAdmin.from("influenciadores").insert([
      {
        nome: "[DEMO] Ana Ribeiro",
        tipo: "influenciador",
        nicho: "Lifestyle",
        cidade: "São Paulo",
        estado: "SP",
        instagram: "@ana.demo",
        seguidores_total: 125000,
        cache_valor: 4500,
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        nome: "[DEMO] Pedro Costa",
        tipo: "influenciador",
        nicho: "Automotivo",
        cidade: "Brasília",
        estado: "DF",
        instagram: "@pedro.demo",
        seguidores_total: 82000,
        cache_valor: 3200,
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        nome: "[DEMO] Júlia Mendes",
        tipo: "influenciador",
        nicho: "Moda",
        cidade: "Rio de Janeiro",
        estado: "RJ",
        instagram: "@julia.demo",
        seguidores_total: 210000,
        cache_valor: 6800,
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        nome: "[DEMO] Rafael Souza",
        tipo: "influenciador",
        nicho: "Gastronomia",
        cidade: "Belo Horizonte",
        estado: "MG",
        instagram: "@rafa.demo",
        seguidores_total: 96000,
        cache_valor: 3800,
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        nome: "[DEMO] Camila Duarte",
        tipo: "influenciador",
        nicho: "Fitness",
        cidade: "Curitiba",
        estado: "PR",
        instagram: "@cami.demo",
        seguidores_total: 154000,
        cache_valor: 5200,
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        nome: "[DEMO] Lucas Barros",
        tipo: "influenciador",
        nicho: "Tecnologia",
        cidade: "Fortaleza",
        estado: "CE",
        instagram: "@lucas.demo",
        seguidores_total: 68000,
        cache_valor: 2600,
        tenant_id: tenantId,
        created_by: userId,
      },
    ] as never);

    // ---- Metas do executivo (4 meses)
    const metas: any[] = [];
    for (let m = 0; m < 4; m++) {
      const dt = new Date(today.getFullYear(), today.getMonth() + m, 1);
      metas.push({
        executivo_id: userId,
        ano: dt.getFullYear(),
        mes: dt.getMonth() + 1,
        valor_meta: 80000 + m * 15000,
        tenant_id: tenantId,
        created_by: userId,
      });
    }
    await supabaseAdmin.from("metas_executivo").insert(metas as never);

    // ---- Reuniões + eventos (6)
    if (cli.length >= 6) {
      const reunioes: any[] = [];
      const eventos: any[] = [];
      for (let i = 0; i < 6; i++) {
        const ini = addDays(today, i * 2 + 1);
        ini.setHours(10 + i, 0, 0, 0);
        const fim = new Date(ini);
        fim.setHours(ini.getHours() + 1, 0, 0, 0);
        reunioes.push({
          titulo: `[DEMO] Reunião ${cli[i].razao_social.replace("[DEMO] ", "")}`,
          cliente_id: cli[i].id,
          executivo_id: userId,
          data_inicio: iso(ini),
          data_fim: iso(fim),
          status: "agendada",
          tenant_id: tenantId,
          created_by: userId,
        });
        eventos.push({
          user_id: userId,
          titulo: `[DEMO] Follow-up ${cli[i].razao_social.replace("[DEMO] ", "")}`,
          inicio: iso(ini),
          fim: iso(fim),
          cliente_id: cli[i].id,
          origem: "manual",
          tenant_id: tenantId,
        });
      }
      await supabaseAdmin.from("reunioes").insert(reunioes as never);
      await supabaseAdmin.from("eventos_calendario").insert(eventos as never);
    }

    // ---- Permuta recebimentos (4)
    if (cli.length >= 4) {
      await supabaseAdmin.from("permuta_recebimentos").insert([
        {
          cliente_id: cli[0].id,
          descricao: "[DEMO] Vale-compras Padaria",
          valor: 1500,
          data_recebimento: isoDate(today),
          criado_por: userId,
          tenant_id: tenantId,
        },
        {
          cliente_id: cli[1].id,
          descricao: "[DEMO] Serviço de revisão",
          valor: 2800,
          data_recebimento: isoDate(today),
          criado_por: userId,
          tenant_id: tenantId,
        },
        {
          cliente_id: cli[3].id,
          descricao: "[DEMO] Convênio clínico",
          valor: 3200,
          data_recebimento: isoDate(addDays(today, -10)),
          criado_por: userId,
          tenant_id: tenantId,
        },
        {
          cliente_id: cli[6].id,
          descricao: "[DEMO] Diárias em hotel",
          valor: 4500,
          data_recebimento: isoDate(addDays(today, -20)),
          criado_por: userId,
          tenant_id: tenantId,
        },
      ] as never);
    }

    // ---- Links úteis (5)
    await supabaseAdmin.from("links_uteis").insert([
      {
        titulo: "[DEMO] Kit de mídia 2026",
        url: "https://exemplo.com/kit-midia",
        categoria: "Comercial",
        icone: "file-text",
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        titulo: "[DEMO] Tabela de preços",
        url: "https://exemplo.com/tabela",
        categoria: "Comercial",
        icone: "table",
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        titulo: "[DEMO] Manual de marca",
        url: "https://exemplo.com/manual",
        categoria: "Criação",
        icone: "book",
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        titulo: "[DEMO] Contrato modelo",
        url: "https://exemplo.com/contrato",
        categoria: "Jurídico",
        icone: "file",
        tenant_id: tenantId,
        created_by: userId,
      },
      {
        titulo: "[DEMO] Guia de veiculação",
        url: "https://exemplo.com/guia-veic",
        categoria: "Operação",
        icone: "compass",
        tenant_id: tenantId,
        created_by: userId,
      },
    ] as never);

    // ---- Notificações (3)
    await supabaseAdmin.from("notificacoes").insert([
      {
        user_id: userId,
        tenant_id: tenantId,
        tipo: "outro",
        titulo: "🎉 Bem-vindo ao mídia.OS!",
        mensagem: "Sua conta demo tem 48h. Explore os módulos com dados fictícios já cadastrados.",
        link: "/",
      },
      {
        user_id: userId,
        tenant_id: tenantId,
        tipo: "outro",
        titulo: "📊 Dashboards prontos",
        mensagem: "Confira KPIs, funil de PIs e ranking de executivos.",
        link: "/",
      },
      {
        user_id: userId,
        tenant_id: tenantId,
        tipo: "outro",
        titulo: "🗓️ Agenda populada",
        mensagem: "Você tem 6 reuniões demo agendadas para os próximos dias.",
        link: "/calendario",
      },
    ] as never);

    return {
      ok: true,
      skipped: false,
      clientes: cli.length,
      agencias: 5,
      emissoras: ems.length,
    };
  });
