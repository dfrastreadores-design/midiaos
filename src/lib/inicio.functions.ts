import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FRASES = [
  "Vendas grandes começam com pequenas atitudes diárias.",
  "Quem planta hoje, fatura amanhã.",
  "Cada ligação é uma porta. Bata em todas.",
  "Foco no cliente, o resto se resolve.",
  "Disciplina supera motivação.",
  "Você está mais perto da meta do que ontem.",
  "Negociação é confiança em movimento.",
  "Pequenas vitórias diárias constroem grandes resultados.",
  "Quem domina a agenda, domina o mês.",
  "O melhor PI é o que está fechado.",
];

export const getInicio = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const now = new Date();
    const hojeIni = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const hojeFim = new Date(hojeIni.getTime() + 24 * 60 * 60 * 1000);
    const em7 = new Date(hojeIni.getTime() + 7 * 24 * 60 * 60 * 1000);
    const hojeStr = hojeIni.toISOString().slice(0, 10);
    const em7Str = em7.toISOString().slice(0, 10);

    const [profRes, reunRes, evRes, propRes, piRes, propAprovRes, propEnvRes, checkRes] = await Promise.all([
      supabase.from("profiles").select("nome").eq("id", userId).maybeSingle(),
      supabase
        .from("reunioes")
        .select("id,titulo,data_inicio,data_fim,local,status,cliente_id,agencia_id")
        .gte("data_inicio", hojeIni.toISOString())
        .lt("data_inicio", hojeFim.toISOString())
        .order("data_inicio"),
      supabase
        .from("eventos_calendario")
        .select("id,titulo,inicio,fim,local,origem,origem_subtipo")
        .eq("user_id", userId)
        .gte("inicio", hojeIni.toISOString())
        .lt("inicio", hojeFim.toISOString())
        .order("inicio"),
      supabase
        .from("propostas")
        .select(
          "id,numero,campanha,validade,valor_negociado,status,cliente_id,agencia_id,created_at",
        )
        .not("validade", "is", null)
        .gte("validade", hojeStr)
        .lte("validade", em7Str)
        .in("status", ["rascunho", "enviada"])
        .order("created_at", { ascending: false }),
      supabase
        .from("pis")
        .select(
          "id,numero,campanha,periodo_inicio,periodo_fim,valor_negociado,status,cliente_id,agencia_id,created_at",
        )
        .not("periodo_fim", "is", null)
        .gte("periodo_fim", hojeStr)
        .lte("periodo_fim", em7Str)
        .order("periodo_fim", { ascending: true })
        .limit(200),
      supabase
        .from("propostas")
        .select("id,numero,campanha,valor_negociado,status,created_at,cliente_id,clientes(razao_social,nome_fantasia)")
        .eq("status", "aprovada")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("propostas")
        .select("id,numero,campanha,validade,valor_negociado,status,created_at,cliente_id,clientes(razao_social,nome_fantasia)")
        .eq("status", "enviada")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("pi_checkings")
        .select("id,status,file_name,broadcast_date,pi_id")
        .in("status", ["PENDING", "UPLOADED"])
        .limit(50),
    ]);

    // Mantém apenas o registro mais recente por cliente/agência
    const dedupeByEntidade = <
      T extends { cliente_id?: string | null; agencia_id?: string | null; id: string },
    >(
      rows: T[],
    ) => {
      const seen = new Set<string>();
      const out: T[] = [];
      for (const r of rows) {
        const key = r.cliente_id
          ? `c:${r.cliente_id}`
          : r.agencia_id
            ? `a:${r.agencia_id}`
            : `x:${r.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
      }
      return out;
    };

    const piVencendo = dedupeByEntidade(piRes.data ?? []);
    const propostasVencendo = dedupeByEntidade(propRes.data ?? []);

    const frase = FRASES[Math.floor(Math.random() * FRASES.length)];

    return {
      nome: profRes.data?.nome ?? null,
      frase,
      reunioesHoje: reunRes.data ?? [],
      eventosHoje: evRes.data ?? [],
      propostasAVencer: propostasVencendo,
      pisAVencer: piVencendo,
      radar: {
        campanhasSemPi: propAprovRes.data ?? [],
        propostasAguardando: propEnvRes.data ?? [],
        checkingPendente: checkRes.data ?? [],
        ativosVencendo: piVencendo,
      },
    };
  });
