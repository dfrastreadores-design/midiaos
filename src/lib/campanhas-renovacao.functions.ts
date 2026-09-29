import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface CampanhaRenovacaoAlerta {
  pi_id: string;
  numero: string;
  campanha: string;
  cliente_id?: string | null;
  cliente_nome: string;
  cliente_contato?: string | null;
  cliente_telefone?: string | null;
  cliente_email?: string | null;
  executivo_id?: string | null;
  executivo_nome?: string | null;
  valor_negociado: number;
  periodo_fim: string;
  dias_uteis_restantes: number;
  urgencia: "critica" | "alta" | "media";
  ja_renovado?: boolean;
}

/**
 * Calcula dias úteis (segunda a sexta-feira) entre hoje e a data alvo.
 * Retorna número negativo se a data já estiver no passado.
 */
export function calcularDiasUteisRestantes(dataFimStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Normaliza data fim
  let dataFim: Date;
  if (dataFimStr.includes("T")) {
    dataFim = new Date(dataFimStr);
  } else {
    const [y, m, d] = dataFimStr.split("-").map(Number);
    dataFim = new Date(y, m - 1, d);
  }
  dataFim.setHours(0, 0, 0, 0);

  // Se já passou
  if (dataFim < hoje) {
    const diffMs = hoje.getTime() - dataFim.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return -diffDays;
  }

  // Se é hoje
  if (dataFim.getTime() === hoje.getTime()) {
    return 0;
  }

  let diasUteis = 0;
  const cursor = new Date(hoje);

  while (cursor < dataFim) {
    cursor.setDate(cursor.getDate() + 1);
    const dow = cursor.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dow !== 0 && dow !== 6) {
      diasUteis++;
    }
  }

  return diasUteis;
}

/**
 * Lista campanhas/PIs que estão na janela de renovação (10 dias úteis ou menos do término)
 */
export const listCampanhasRenovacao10Dias = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CampanhaRenovacaoAlerta[]> => {
    const { supabase, userId } = context;

    // Buscar perfil e roles do usuário
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const hasBroadAccess = roles.some((r: string) =>
      ["admin", "diretoria", "opec", "financeiro", "super_admin"].includes(r)
    );

    // Buscar PIs ativos/veiculando/aprovados
    const statusAtivos = [
      "aprovado",
      "veiculado",
      "faturado",
      "enviado",
      "assinado",
      "enviar_opec",
      "finalizado",
    ];

    let query = supabase
      .from("pis")
      .select(
        `
        id,
        numero,
        campanha,
        cliente_id,
        executivo_id,
        periodo_fim,
        mes_veiculacao,
        ano_veiculacao,
        valor_negociado,
        status,
        observacao,
        cliente:clientes(id, razao_social, nome_fantasia, contato_nome, telefone, email)
      `
      )
      .in("status", statusAtivos);

    if (!hasBroadAccess) {
      query = query.or(`executivo_id.eq.${userId},created_by.eq.${userId}`);
    }

    const { data: pis, error } = await query;
    if (error) {
      console.warn("Erro ao buscar PIs para renovação:", error.message);
      return [];
    }

    // Buscar nomes dos executivos
    const executivoIds = Array.from(
      new Set((pis ?? []).map((p) => p.executivo_id).filter(Boolean))
    );
    const executivosMap = new Map<string, string>();
    if (executivoIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", executivoIds);
      (profiles ?? []).forEach((prof: any) => {
        executivosMap.set(prof.id, prof.nome);
      });
    }

    const alertas: CampanhaRenovacaoAlerta[] = [];

    for (const p of pis ?? []) {
      // Determina a data final da campanha
      let dataFimStr: string | null = p.periodo_fim;

      if (!dataFimStr && p.mes_veiculacao && p.ano_veiculacao) {
        // Último dia do mês de veiculação
        const ultimoDia = new Date(p.ano_veiculacao, p.mes_veiculacao, 0).getDate();
        dataFimStr = `${p.ano_veiculacao}-${String(p.mes_veiculacao).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
      }

      if (!dataFimStr) continue;

      const diasUteis = calcularDiasUteisRestantes(dataFimStr);

      // Janela de alerta: entre 0 e 10 dias úteis restantes (ou recém-encerrada há no máximo 3 dias)
      if (diasUteis <= 10 && diasUteis >= -3) {
        let urgencia: "critica" | "alta" | "media" = "media";
        if (diasUteis <= 3) {
          urgencia = "critica"; // 0 a 3 dias úteis
        } else if (diasUteis <= 6) {
          urgencia = "alta"; // 4 a 6 dias úteis
        } else {
          urgencia = "media"; // 7 a 10 dias úteis
        }

        const clienteObj = p.cliente as any;
        const clienteNome =
          clienteObj?.nome_fantasia ||
          clienteObj?.razao_social ||
          "Cliente não identificado";

        alertas.push({
          pi_id: p.id,
          numero: p.numero || "S/N",
          campanha: p.campanha || "Campanha sem título",
          cliente_id: p.cliente_id,
          cliente_nome: clienteNome,
          cliente_contato: clienteObj?.contato_nome || null,
          cliente_telefone: clienteObj?.telefone || null,
          cliente_email: clienteObj?.email || null,
          executivo_id: p.executivo_id,
          executivo_nome: p.executivo_id
            ? executivosMap.get(p.executivo_id) || "Executivo"
            : "Não atribuído",
          valor_negociado: Number(p.valor_negociado) || 0,
          periodo_fim: dataFimStr,
          dias_uteis_restantes: diasUteis,
          urgencia,
        });
      }
    }

    // Ordena da mais urgente (menor dias úteis restantes) para a menos urgente
    return alertas.sort((a, b) => a.dias_uteis_restantes - b.dias_uteis_restantes);
  });

/**
 * Dispara notificações automáticas no sino e gera follow-ups de renovação
 */
export const dispararNotificacoesRenovacao10Dias = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const listFn = listCampanhasRenovacao10Dias;
    const campanhas = await listFn();

    if (campanhas.length === 0) {
      return { ok: true, count: 0 };
    }

    // Buscar admins e diretores para notificar também
    const [{ data: admins }, { data: diretorias }] = await Promise.all([
      supabase.from("user_roles").select("user_id").eq("role", "admin" as never),
      supabase.from("user_roles").select("user_id").eq("role", "diretoria" as never),
    ]);

    const adminIds = new Set<string>();
    [...(admins ?? []), ...(diretorias ?? [])].forEach((r: any) => {
      if (r.user_id) adminIds.add(r.user_id);
    });

    let notificacoesInseridas = 0;

    for (const c of campanhas) {
      const diasTexto =
        c.dias_uteis_restantes === 0
          ? "termina HOJE"
          : c.dias_uteis_restantes === 1
          ? "termina em 1 dia útil"
          : `termina em ${c.dias_uteis_restantes} dias úteis`;

      const titulo = `⏰ Alerta Renovação: ${c.cliente_nome} (${diasTexto})`;
      const mensagem = `A campanha "${c.campanha}" (PI ${c.numero}) encerra em ${c.periodo_fim.split("-").reverse().join("/")}. Inicie a negociação de renovação comercial.`;

      // Evita duplicar notificação idêntica para este PI nos últimos 5 dias
      const cincoDiasAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
      const { data: existente } = await supabase
        .from("notificacoes")
        .select("id")
        .eq("tipo", "alerta_renovacao_campanha")
        .contains("metadata", { pi_id: c.pi_id })
        .gte("created_at", cincoDiasAtras)
        .limit(1);

      if (existente && existente.length > 0) {
        continue;
      }

      // Destinatários: executivo da conta + admins
      const destinatarios = new Set<string>();
      if (c.executivo_id) destinatarios.add(c.executivo_id);
      adminIds.forEach((id) => destinatarios.add(id));

      const rows = Array.from(destinatarios).map((uid) => ({
        user_id: uid,
        tipo: "alerta_renovacao_campanha",
        titulo,
        mensagem,
        link: `/pi?id=${c.pi_id}`,
        metadata: {
          pi_id: c.pi_id,
          dias_uteis: c.dias_uteis_restantes,
          cliente_nome: c.cliente_nome,
          evento: "alerta_renovacao_10_dias",
        },
      }));

      if (rows.length > 0) {
        await supabase.from("notificacoes").insert(rows as never);
        notificacoesInseridas += rows.length;
      }
    }

    return { ok: true, count: notificacoesInseridas };
  });
