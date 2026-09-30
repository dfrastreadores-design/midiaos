import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { executivoId?: string | null }) => data ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const execFilter = data?.executivoId || null;
    // Authorize: only admins can filter by another executivo
    if (execFilter && execFilter !== userId) {
      const { data: isAdminRow } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdminRow) throw new Error("Sem permissão");
    }
    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth(); // 0..11
    const inicioMesAtual = new Date(ano, mes, 1);
    const inicioMesAnterior = new Date(ano, mes - 1, 1);
    const fimMesAnterior = new Date(ano, mes, 0);

    let pisQ = supabase
      .from("pis")
      .select(
        "id,status,valor_negociado,total_insercoes,data_faturamento,executivo_id,created_at,cliente_id,agencia_id,permuta,permuta_uso",
      )
      .gte("created_at", new Date(ano - 1, 0, 1).toISOString());
    let propQ = supabase
      .from("propostas")
      .select("id,status,valor_negociado,executivo_id,created_at,agencia_id");
    let clientesQ = supabase.from("clientes").select("id,executivo_id,razao_social,nome_fantasia");
    let metasQ = supabase
      .from("metas_executivo")
      .select("executivo_id,ano,mes,valor_meta")
      .eq("ano", ano)
      .gte("mes", 1)
      .lte("mes", 12);
    if (execFilter) {
      pisQ = pisQ.eq("executivo_id", execFilter);
      propQ = propQ.eq("executivo_id", execFilter);
      clientesQ = clientesQ.eq("executivo_id", execFilter);
      metasQ = metasQ.eq("executivo_id", execFilter);
    }

    const [pisRes, propRes, clientesRes, agenciasRes, itensRes, profilesRes, metasRes] =
      await Promise.all([
        pisQ,
        propQ,
        clientesQ,
        supabase.from("agencias").select("id,razao_social,nome_fantasia"),
        supabase.from("pi_itens").select("tipo,valor_negociado,pi_id"),
        supabase.from("profiles").select("id,nome").eq("ativo", true),
        metasQ,
      ]);

    const pis = pisRes.data ?? [];
    const propostas = propRes.data ?? [];
    const clientes = clientesRes.data ?? [];
    const agencias = agenciasRes.data ?? [];
    const itens = itensRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const metas = metasRes.data ?? [];

    // Líquido: com agência (agencia_id) → bruto * 0.8; sem agência → bruto.
    const liquido = (bruto: number, agenciaId: string | null | undefined) =>
      agenciaId ? Number(bruto || 0) * 0.8 : Number(bruto || 0);

    // Considera apenas PIs vigentes (último PI) — exclui substituídos/cancelados.
    const piAtivo = (p: any) => p.status !== "substituido" && p.status !== "cancelado";

    // KPIs (todas as vendas usam valor LÍQUIDO do último PI vigente)
    // Permuta para uso comercial NÃO conta para meta/faturamento executivo
    const paraFaturamento = (p: any) => {
      if (p.permuta && p.permuta_uso === "comercial") return 0;
      return liquido(Number(p.valor_negociado || 0), p.agencia_id);
    };

    // Data de referência: faturamento se existir, senão a criação do PI
    const dataRef = (p: any): Date | null => {
      if (p.data_faturamento) return new Date(p.data_faturamento + "T00:00:00");
      if (p.created_at) return new Date(p.created_at as string);
      return null;
    };

    const faturadosMes = pis
      .filter((p) => {
        const d = dataRef(p);
        return piAtivo(p) && d && d >= inicioMesAtual;
      })
      .reduce((a, b) => a + paraFaturamento(b), 0);
    const faturadosMesLiq = faturadosMes;
    const faturadosMesAnt = pis
      .filter((p) => {
        if (!piAtivo(p)) return false;
        const d = dataRef(p);
        return !!d && d >= inicioMesAnterior && d <= fimMesAnterior;
      })
      .reduce((a, b) => a + paraFaturamento(b), 0);
    const deltaFat =
      faturadosMesAnt > 0 ? ((faturadosMes - faturadosMesAnt) / faturadosMesAnt) * 100 : 0;

    const propostasAtivas = propostas.filter(
      (p) => p.status === "rascunho" || p.status === "enviada",
    ).length;
    const pipelineAberto = pis
      .filter((p) => piAtivo(p) && p.status !== "faturado")
      .reduce((a, b) => a + paraFaturamento(b), 0);
    const pipelineAbertoLiq = pipelineAberto;
    const clientesAtivos = clientes.length;

    // Faturamento mensal (ano corrente) — PIs vigentes (por faturamento ou criação)
    const fatPorMes = new Array(12).fill(0);
    const fatPorMesLiq = new Array(12).fill(0);
    pis.forEach((p) => {
      if (!piAtivo(p)) return;
      const d = dataRef(p);
      if (!d) return;
      if (d.getFullYear() === ano) {
        const liq = paraFaturamento(p);
        fatPorMes[d.getMonth()] += liq;
        fatPorMesLiq[d.getMonth()] += liq;
      }
    });
    const metaPorMes = new Array(12).fill(0);
    metas.forEach((m) => {
      if (m.mes >= 1 && m.mes <= 12) metaPorMes[m.mes - 1] += Number(m.valor_meta || 0);
    });
    const faturamentoMensal = MESES.map((mesNome, i) => ({
      mes: mesNome,
      valor: fatPorMes[i],
      liquido: fatPorMesLiq[i],
      meta: metaPorMes[i],
    }));

    // Mix por tipo de item (em valor bruto)
    const pisAtivosIds = new Set(
      pis.filter((p) => p.status !== "cancelado" && p.status !== "substituido").map((p) => p.id),
    );
    const mixMap = new Map<string, number>();
    itens.forEach((it) => {
      if (!pisAtivosIds.has(it.pi_id)) return;
      const k = it.tipo || "Outro";
      mixMap.set(k, (mixMap.get(k) || 0) + Number(it.valor_negociado || 0));
    });
    const mixProduto = Array.from(mixMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Funil: por status PI (bruto + líquido)
    const funilDef: Array<{ stage: string; statuses: string[] }> = [
      { stage: "Rascunho", statuses: ["rascunho"] },
      {
        stage: "Enviado",
        statuses: ["enviado", "aguardando_aprovacao", "aguardando_assinatura", "assinado"],
      },
      { stage: "Aprovado", statuses: ["aprovado", "enviar_opec"] },
      { stage: "Faturado", statuses: ["faturado", "finalizado"] },
    ];
    const funil = funilDef.map((f) => {
      const ps = pis.filter((p) => f.statuses.includes(p.status as string));
      return {
        stage: f.stage,
        valor: ps.reduce((a, b) => a + Number(b.valor_negociado || 0), 0),
        liquido: ps.reduce((a, b) => a + liquido(Number(b.valor_negociado || 0), b.agencia_id), 0),
      };
    });

    // Desempenho executivos (faturado no ano) — apenas PIs vigentes, valor líquido
    const nomeById = new Map(profiles.map((p) => [p.id, p.nome]));
    const execMap = new Map<string, { vendas: number; vendasLiq: number; deals: number }>();
    pis.forEach((p) => {
      if (!piAtivo(p) || !p.executivo_id) return;
      const d = dataRef(p);
      if (!d || d.getFullYear() !== ano) return;
      const e = execMap.get(p.executivo_id) ?? { vendas: 0, vendasLiq: 0, deals: 0 };
      const liq = paraFaturamento(p);
      e.vendas += liq;
      e.vendasLiq += liq;
      e.deals += 1;
      execMap.set(p.executivo_id, e);
    });
    const desempenhoExecutivos = Array.from(execMap.entries())
      .map(([id, v]) => ({
        id,
        nome: nomeById.get(id) || "—",
        vendas: v.vendas,
        vendasLiq: v.vendasLiq,
        deals: v.deals,
      }))
      .sort((a, b) => b.vendas - a.vendas)
      .slice(0, 8);

    // Top clientes / agências por investimento (PIs vigentes no ano corrente, valor líquido)
    const clienteNome = new Map(
      clientes.map((c) => [c.id, c.nome_fantasia || c.razao_social || "—"]),
    );
    const agenciaNome = new Map(
      agencias.map((a) => [a.id, a.nome_fantasia || a.razao_social || "—"]),
    );
    const topMap = (campo: "cliente_id" | "agencia_id", nomeMap: Map<string, string>) => {
      const m = new Map<string, number>();
      pis.forEach((p) => {
        if (!piAtivo(p)) return;
        const created = new Date(p.created_at as string);
        if (created.getFullYear() !== ano) return;
        const id = (p as Record<string, unknown>)[campo] as string | null;
        if (!id) return;
        m.set(id, (m.get(id) ?? 0) + paraFaturamento(p));
      });
      return Array.from(m.entries())
        .map(([id, valor]) => ({ nome: nomeMap.get(id) || "—", valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 6);
    };
    const topClientes = topMap("cliente_id", clienteNome);
    const topAgencias = topMap("agencia_id", agenciaNome);

    // Distribuição por status (donut)
    const statusMap = new Map<string, number>();
    pis.forEach((p) =>
      statusMap.set(p.status as string, (statusMap.get(p.status as string) ?? 0) + 1),
    );
    const piStatusDist = Array.from(statusMap.entries()).map(([name, value]) => ({ name, value }));

    // PIs criados por mês (ano atual vs anterior) — apenas PIs vigentes, valor líquido
    const criadosAtual = new Array(12).fill(0);
    const criadosAnt = new Array(12).fill(0);
    pis.forEach((p) => {
      if (!piAtivo(p)) return;
      const d = new Date(p.created_at as string);
      const liq = paraFaturamento(p);
      if (d.getFullYear() === ano) criadosAtual[d.getMonth()] += liq;
      else if (d.getFullYear() === ano - 1) criadosAnt[d.getMonth()] += liq;
    });
    const vendasComparativo = MESES.map((m, i) => ({
      mes: m,
      atual: criadosAtual[i],
      anterior: criadosAnt[i],
    }));

    // Propostas por status
    const propStatusMap = new Map<string, number>();
    propostas.forEach((p) =>
      propStatusMap.set(p.status as string, (propStatusMap.get(p.status as string) ?? 0) + 1),
    );
    const propostasStatusDist = Array.from(propStatusMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    // Inserções por mídia (tipo de item)
    const insercoesMap = new Map<string, number>();
    itens.forEach((it) => {
      if (!pisAtivosIds.has(it.pi_id)) return;
      const k = it.tipo || "Outro";
      insercoesMap.set(
        k,
        (insercoesMap.get(k) ?? 0) + Number((it as Record<string, unknown>).valor_negociado || 0),
      );
    });

    return {
      kpis: {
        faturamentoMes: faturadosMes,
        faturamentoMesLiquido: faturadosMesLiq,
        deltaFat,
        propostasAtivas,
        pipelineAberto,
        pipelineAbertoLiquido: pipelineAbertoLiq,
        clientesAtivos,
      },
      faturamentoMensal,
      mixProduto,
      funil,
      desempenhoExecutivos,
      topClientes,
      topAgencias,
      piStatusDist,
      propostasStatusDist,
      vendasComparativo,
      periodo: `${MESES[mes]} / ${ano}`,
    };
  });

export const getVendasMes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { ano: number; mes: number; executivoId?: string | null }) => data)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { ano, mes } = data;
    const execFilter = data.executivoId || null;
    if (execFilter && execFilter !== userId) {
      const { data: isAdminRow } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdminRow) throw new Error("Sem permissão");
    }
    const inicio = new Date(ano, mes - 1, 1);
    const fim = new Date(ano, mes, 0);
    const inicioStr = inicio.toISOString().slice(0, 10);
    const fimStr = fim.toISOString().slice(0, 10);

    let q = supabase
      .from("pis")
      .select(
        "status,valor_negociado,data_faturamento,created_at,agencia_id,permuta,permuta_uso,executivo_id,mes_meta,ano_meta",
      )
      .or(
        `and(mes_meta.eq.${mes},ano_meta.eq.${ano}),and(mes_meta.is.null,data_faturamento.gte.${inicioStr},data_faturamento.lte.${fimStr}),and(mes_meta.is.null,data_faturamento.is.null,created_at.gte.${inicio.toISOString()},created_at.lte.${new Date(fim.getTime() + 86399999).toISOString()})`,
      );
    if (execFilter) q = q.eq("executivo_id", execFilter);
    const { data: pis } = await q;

    const liquido = (bruto: number, agenciaId: string | null | undefined) =>
      agenciaId ? Number(bruto || 0) * 0.8 : Number(bruto || 0);
    const paraFaturamento = (p: any) => {
      if (p.permuta && p.permuta_uso === "comercial") return 0;
      return liquido(Number(p.valor_negociado || 0), p.agencia_id);
    };
    // Conta para meta apenas PIs com status "enviado" em diante (exclui rascunho/reprovado/cancelado/substituido)
    const STATUS_META = new Set([
      "enviado",
      "aguardando_aprovacao",
      "aguardando_assinatura",
      "assinado",
      "aprovado",
      "enviar_opec",
      "faturado",
      "finalizado",
    ]);
    const piAtivo = (p: any) => STATUS_META.has(p.status as string);
    // Data de referência: se mes_meta/ano_meta foram informados, usar dia 1 desse mês; senão data_faturamento ou created_at
    const dataRef = (p: any): Date | null => {
      if (p.mes_meta && p.ano_meta) return new Date(p.ano_meta, p.mes_meta - 1, 1);
      if (p.data_faturamento) return new Date(p.data_faturamento + "T00:00:00");
      if (p.created_at) return new Date(p.created_at as string);
      return null;
    };

    const dias = fim.getDate();
    const porDia = Array.from({ length: dias }, (_, i) => ({
      dia: String(i + 1).padStart(2, "0"),
      valor: 0,
    }));
    let total = 0;
    (pis ?? []).forEach((p) => {
      const d = dataRef(p);
      if (!piAtivo(p) || !d) return;
      // Se o PI tem meta explícita, só conta se bater com mês/ano selecionado
      if (p.mes_meta && p.ano_meta) {
        if (p.mes_meta !== mes || p.ano_meta !== ano) return;
      } else if (d.getFullYear() !== ano || d.getMonth() + 1 !== mes) {
        return;
      }
      const idx = p.mes_meta && p.ano_meta ? 0 : d.getDate() - 1;
      const v = paraFaturamento(p);
      if (porDia[idx]) porDia[idx].valor += v;
      total += v;
    });

    let mq = supabase.from("metas_executivo").select("valor_meta").eq("ano", ano).eq("mes", mes);
    if (execFilter) mq = mq.eq("executivo_id", execFilter);
    const { data: metas } = await mq;
    const meta = (metas ?? []).reduce((a, b) => a + Number(b.valor_meta || 0), 0);

    return { porDia, total, meta, ano, mes };
  });

// ============================================================
// Drill-down: PIs filtrados por status/executivo/cliente/agência/tipo/mês
// ============================================================
export type DrillFilter = {
  status?: string | string[] | null;
  executivoId?: string | null;
  clienteNome?: string | null;
  agenciaNome?: string | null;
  tipo?: string | null;
  mes?: string | null; // "Jan".."Dez" ano corrente
  scope?: "ano" | "mes" | null;
};

export const getPisDrillDown = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: DrillFilter) => data ?? {})
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const ano = now.getFullYear();

    let q = supabase
      .from("pis")
      .select(
        "id,numero_pi,status,valor_negociado,valor_liquido,data_faturamento,created_at,cliente_id,agencia_id,executivo_id,clientes(razao_social,nome_fantasia),agencias(nome),profiles:executivo_id(nome,email)",
      )
      .order("created_at", { ascending: false })
      .limit(100);

    // Scope temporal
    if (data.scope === "mes") {
      const inicio = new Date(ano, now.getMonth(), 1).toISOString();
      q = q.gte("created_at", inicio);
    } else {
      q = q.gte("created_at", new Date(ano, 0, 1).toISOString());
    }

    if (data.status) {
      if (Array.isArray(data.status)) q = (q as any).in("status", data.status);
      else q = q.eq("status", data.status as any);
    }

    // tipo: filtragem por tipo é feita client-side pois vive em pi_itens
    if (data.executivoId) q = q.eq("executivo_id", data.executivoId);

    // Non-admins só veem os próprios
    const { data: isAdminRow } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdminRow && !data.executivoId) q = q.eq("executivo_id", userId);

    const { data: rows, error } = await q;
    if (error) throw error;

    let list = (rows ?? []) as any[];

    // Filtros por nome (post-fetch — colunas relacionadas)
    if (data.clienteNome) {
      const n = data.clienteNome.toLowerCase();
      list = list.filter((p) => {
        const c = p.clientes || {};
        return (c.nome_fantasia || c.razao_social || "").toLowerCase().includes(n);
      });
    }
    if (data.agenciaNome) {
      const n = data.agenciaNome.toLowerCase();
      list = list.filter((p) => (p.agencias?.nome || "").toLowerCase().includes(n));
    }
    if (data.mes) {
      const idx = MESES.findIndex((m) => m === data.mes);
      if (idx >= 0) {
        list = list.filter((p) => {
          const dt = p.data_faturamento ? new Date(p.data_faturamento) : new Date(p.created_at);
          return dt.getFullYear() === ano && dt.getMonth() === idx;
        });
      }
    }

    return list.map((p) => ({
      id: p.id,
      numero_pi: p.numero_pi,
      status: p.status,
      tipo: null as string | null,
      valor_bruto: Number(p.valor_negociado || 0),
      valor_liquido: Number(p.valor_liquido || 0),
      data_faturamento: p.data_faturamento,
      created_at: p.created_at,
      cliente: p.clientes?.nome_fantasia || p.clientes?.razao_social || "—",
      agencia: p.agencias?.nome || "—",
      executivo: p.profiles?.nome || p.profiles?.email || "—",
    }));
  });
