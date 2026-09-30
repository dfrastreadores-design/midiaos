import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type FunnelStage =
  | "prospeccao"
  | "negociacao"
  | "proposta"
  | "aprovacao"
  | "faturamento"
  | "finalizado";

export const stageLabels: Record<FunnelStage, string> = {
  prospeccao: "Prospecção",
  negociacao: "Negociação",
  proposta: "Proposta enviada",
  aprovacao: "Em aprovação",
  faturamento: "Faturamento",
  finalizado: "Finalizado",
};

export type CrmCard = {
  cliente_id: string;
  cliente_nome: string;
  stage: FunnelStage;
  valor: number;
  campanha: string;
  proximoPasso: string;
  executivo: string | null;
  atualizado_em: string;
  alerta?: "parado" | "urgente" | "atencao";
  alerta_msg?: string;
};

const STAGE_RANK: Record<FunnelStage, number> = {
  prospeccao: 0,
  negociacao: 1,
  proposta: 2,
  aprovacao: 3,
  faturamento: 4,
  finalizado: 5,
};

export const getFunilCrm = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [
      { data: clientes, error: cErr },
      { data: propostas, error: prErr },
      { data: pis, error: piErr },
      { data: profiles, error: pfErr },
    ] = await Promise.all([
      supabase.from("clientes").select("id, razao_social, nome_fantasia, executivo_id, updated_at"),
      supabase
        .from("propostas")
        .select("id, cliente_id, status, campanha, valor_negociado, updated_at"),
      supabase
        .from("pis")
        .select("id, cliente_id, status, campanha, valor_negociado, periodo_fim, updated_at"),
      supabase.from("profiles").select("id, nome"),
    ]);
    if (cErr) throw new Error(cErr.message);
    if (prErr) throw new Error(prErr.message);
    if (piErr) throw new Error(piErr.message);
    if (pfErr) throw new Error(pfErr.message);

    const today = new Date().toISOString().slice(0, 10);
    const nomeExec = new Map<string, string>();
    (profiles ?? []).forEach((p) => nomeExec.set(p.id, p.nome));

    const cards: CrmCard[] = (clientes ?? []).map((c) => {
      const meusPis = (pis ?? []).filter((p) => p.cliente_id === c.id);
      const minhasPropostas = (propostas ?? []).filter((p) => p.cliente_id === c.id);

      let stage: FunnelStage = "prospeccao";
      let campanha = "—";
      let valor = 0;
      let proximo = "Sem oportunidade aberta";
      let updated = c.updated_at;

      const pick = (
        s: FunnelStage,
        novo: { campanha: string; valor: number; passo: string; updated: string },
      ) => {
        if (STAGE_RANK[s] >= STAGE_RANK[stage]) {
          stage = s;
          campanha = novo.campanha;
          valor = Number(novo.valor) || 0;
          proximo = novo.passo;
          updated = novo.updated;
        }
      };

      // Propostas → negociação / proposta
      for (const p of minhasPropostas) {
        if (p.status === "rascunho") {
          pick("negociacao", {
            campanha: p.campanha,
            valor: p.valor_negociado,
            passo: "Finalizar proposta",
            updated: p.updated_at,
          });
        } else if (p.status === "enviada" || p.status === "aprovada" || p.status === "convertida") {
          pick("proposta", {
            campanha: p.campanha,
            valor: p.valor_negociado,
            passo:
              p.status === "enviada"
                ? "Aguardar retorno do cliente"
                : "Proposta aprovada — emitir PI",
            updated: p.updated_at,
          });
        }
      }

      // PIs → aprovação / faturamento / finalizado
      for (const p of meusPis) {
        if (p.status === "rascunho" || p.status === "enviado") {
          pick("aprovacao", {
            campanha: p.campanha,
            valor: p.valor_negociado,
            passo: p.status === "enviado" ? "Aguardar aprovação interna" : "Concluir PI",
            updated: p.updated_at,
          });
        } else if (p.status === "aprovado") {
          const encerrado = p.periodo_fim && p.periodo_fim < today;
          if (encerrado) {
            pick("finalizado", {
              campanha: p.campanha,
              valor: p.valor_negociado,
              passo: "Veiculação concluída — renovar",
              updated: p.updated_at,
            });
          } else {
            pick("faturamento", {
              campanha: p.campanha,
              valor: p.valor_negociado,
              passo: "Em veiculação — faturar",
              updated: p.updated_at,
            });
          }
        } else if (p.status === "faturado") {
          pick("finalizado", {
            campanha: p.campanha,
            valor: p.valor_negociado,
            passo: "PI faturado",
            updated: p.updated_at,
          });
        }
      }

      // Alertas baseados em tempo e status
      let alerta: CrmCard["alerta"];
      let alerta_msg: string | undefined;

      const diasParado = Math.floor(
        (Date.now() - new Date(updated).getTime()) / (1000 * 60 * 60 * 24),
      );

      if (stage === ("prospeccao" as FunnelStage) && diasParado > 15) {
        alerta = "atencao";
        alerta_msg = "Parado em prospecção há mais de 15 dias";
      } else if (stage === ("negociacao" as FunnelStage) && diasParado > 7) {
        alerta = "urgente";
        alerta_msg = "Negociação sem movimento há 1 semana";
      } else if (stage === ("proposta" as FunnelStage) && diasParado > 5) {
        alerta = "urgente";
        alerta_msg = "Proposta enviada sem retorno há 5 dias";
      } else if (stage === ("faturamento" as FunnelStage) && diasParado > 10) {
        alerta = "atencao";
        alerta_msg = "Aguardando faturamento há 10 dias";
      }

      return {
        cliente_id: c.id,
        cliente_nome: c.nome_fantasia || c.razao_social,
        stage,
        valor,
        campanha,
        proximoPasso: proximo,
        executivo: c.executivo_id ? (nomeExec.get(c.executivo_id) ?? null) : null,
        atualizado_em: updated,
        alerta,
        alerta_msg,
      };
    });

    return cards;
  });
