import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type RelatorioTipo =
  | "vendas_periodo"
  | "clientes_ativos"
  | "campanhas_andamento"
  | "faturamento_mensal"
  | "desempenho_executivos"
  | "comissoes_agencias"
  | "pi_status"
  | "propostas_status"
  | "projetos_especiais"
  | "metas_vs_realizado"
  | "produtos_catalogo"
  | "investimento_clientes"
  | "investimento_agencias"
  | "faturamento_fiscal"
  | "notas_emitidas"
  | "contas_a_receber"
  | "pis_consultados"
  | "vendas_executivo_detalhado"
  | "desempenho_executivo_completo";


export type Relatorio = {
  titulo: string;
  geradoEm: string;
  filtros: Record<string, string | number>;
  columns: { key: string; label: string; type?: "currency" | "number" | "date" | "text" }[];
  rows: Record<string, string | number>[];
  totais?: Record<string, number>;
  paginacao?: { page: number; pageSize: number; total: number; truncado?: boolean };
};

const Input = z.object({
  tipo: z.enum([
    "vendas_periodo",
    "clientes_ativos",
    "campanhas_andamento",
    "faturamento_mensal",
    "desempenho_executivos",
    "comissoes_agencias",
    "pi_status",
    "propostas_status",
    "projetos_especiais",
    "metas_vs_realizado",
    "produtos_catalogo",
    "investimento_clientes",
    "investimento_agencias",
    "faturamento_fiscal",
    "notas_emitidas",
    "contas_a_receber",
    "pis_consultados",
    "vendas_executivo_detalhado",
    "desempenho_executivo_completo",
  ]),
  inicio: z.string().optional(),
  fim: z.string().optional(),
  ano: z.number().int().optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).max(500).optional(),
  executivoId: z.string().uuid().optional(),
  clienteId: z.string().uuid().optional(),
  agenciaId: z.string().uuid().optional(),
  status: z.string().optional(),
});



export const gerarRelatorio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }): Promise<Relatorio> => {
    const { supabase } = context;
    const now = new Date();
    const ano = data.ano ?? now.getFullYear();
    const inicio = data.inicio ?? `${ano}-01-01`;
    const fim = data.fim ?? `${ano}-12-31`;
    const filtros: Record<string, string | number> = { inicio, fim, ano };
    const { executivoId, clienteId, agenciaId, status } = data;
    if (executivoId) filtros.executivoId = executivoId;
    if (clienteId) filtros.clienteId = clienteId;
    if (agenciaId) filtros.agenciaId = agenciaId;
    if (status) filtros.status = status;
    const piMatch: Record<string, string> = {};
    if (executivoId) piMatch.executivo_id = executivoId;
    if (clienteId) piMatch.cliente_id = clienteId;
    if (agenciaId) piMatch.agencia_id = agenciaId;
    if (status) piMatch.status = status;
    const propMatch: Record<string, string> = {};
    if (executivoId) propMatch.executivo_id = executivoId;
    if (clienteId) propMatch.cliente_id = clienteId;
    if (status) propMatch.status = status;
    const geradoEm = new Date().toISOString();

    switch (data.tipo) {
      case "vendas_periodo": {
        const page = data.page ?? 1;
        const pageSize = data.pageSize ?? 100;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data: pis, count } = await supabase
          .from("pis")
          .select("numero, campanha, cliente_id, agencia_id, mes_veiculacao, ano_veiculacao, valor_negociado, total_insercoes, status, created_at, clientes(razao_social, nome_fantasia), agencias(razao_social, nome_fantasia)", { count: "estimated" }).match(piMatch)
          .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`)
          .not("status", "in", "(substituido,cancelado)")
          .order("created_at", { ascending: false })
          .range(from, to);
        const rows = (pis ?? []).map((p: any) => ({
          numero: p.numero,
          cliente: p.clientes?.nome_fantasia || p.clientes?.razao_social || "—",
          agencia: p.agencias?.nome_fantasia || p.agencias?.razao_social || "—",
          campanha: p.campanha,
          periodo: `${String(p.mes_veiculacao).padStart(2,"0")}/${p.ano_veiculacao}`,
          insercoes: p.total_insercoes,
          valor: Number(p.valor_negociado),
          status: p.status,
        }));
        return {
          titulo: "Vendas por período",
          geradoEm, filtros,
          columns: [
            { key: "numero", label: "PI" },
            { key: "cliente", label: "Cliente" },
            { key: "agencia", label: "Agência" },
            { key: "campanha", label: "Campanha" },
            { key: "periodo", label: "Veiculação" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "valor", label: "Valor", type: "currency" },
            { key: "status", label: "Status" },
          ],
          rows,
          totais: { valor: rows.reduce((s, r) => s + r.valor, 0), insercoes: rows.reduce((s, r) => s + r.insercoes, 0) },
          paginacao: { page, pageSize, total: count ?? rows.length },
        };
      }
      case "clientes_ativos": {
        const { data: cs } = await supabase.from("clientes").select("*").order("razao_social");
        const rows = (cs ?? []).map((c: any) => ({
          razao_social: c.razao_social,
          nome_fantasia: c.nome_fantasia || "—",
          cnpj: c.cnpj || "—",
          cidade: c.cidade ? `${c.cidade}/${c.uf || ""}` : "—",
          contatos: Array.isArray(c.contatos) ? c.contatos.length : 0,
        }));
        return {
          titulo: "Clientes cadastrados",
          geradoEm, filtros: {},
          columns: [
            { key: "razao_social", label: "Razão Social" },
            { key: "nome_fantasia", label: "Fantasia" },
            { key: "cnpj", label: "CNPJ" },
            { key: "cidade", label: "Cidade" },
            { key: "contatos", label: "Contatos", type: "number" },
          ],
          rows,
        };
      }
      case "campanhas_andamento": {
        const hoje = now.toISOString().slice(0, 10);
        const { data: pis } = await supabase
          .from("pis")
          .select("numero, campanha, periodo_inicio, periodo_fim, valor_negociado, total_insercoes, status, clientes(razao_social, nome_fantasia)").match(piMatch)
          .lte("periodo_inicio", hoje).gte("periodo_fim", hoje)
          .in("status", ["aprovado", "enviado", "rascunho"]);
        const rows = (pis ?? []).map((p: any) => ({
          numero: p.numero,
          cliente: p.clientes?.nome_fantasia || p.clientes?.razao_social || "—",
          campanha: p.campanha,
          inicio: p.periodo_inicio,
          fim: p.periodo_fim,
          insercoes: p.total_insercoes,
          valor: Number(p.valor_negociado),
          status: p.status,
        }));
        return {
          titulo: "Campanhas em andamento",
          geradoEm, filtros: { hoje },
          columns: [
            { key: "numero", label: "PI" },
            { key: "cliente", label: "Cliente" },
            { key: "campanha", label: "Campanha" },
            { key: "inicio", label: "Início", type: "date" },
            { key: "fim", label: "Fim", type: "date" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "valor", label: "Valor", type: "currency" },
            { key: "status", label: "Status" },
          ],
          rows,
          totais: { valor: rows.reduce((s, r) => s + r.valor, 0) },
        };
      }
      case "faturamento_mensal": {
        const { data: pis } = await supabase
          .from("pis").select("mes_veiculacao, ano_veiculacao, valor_negociado").match(piMatch)
          .eq("ano_veiculacao", ano)
          .not("status", "in", "(substituido,cancelado)");
        const meses = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        const map = new Map<number, number>();
        (pis ?? []).forEach((p: any) => {
          map.set(p.mes_veiculacao, (map.get(p.mes_veiculacao) ?? 0) + Number(p.valor_negociado));
        });
        const { data: metas } = await supabase.from("metas_executivo").select("mes, valor_meta").eq("ano", ano);
        const metaPorMes = new Map<number, number>();
        (metas ?? []).forEach((m: any) => {
          metaPorMes.set(m.mes, (metaPorMes.get(m.mes) ?? 0) + Number(m.valor_meta));
        });
        const rows = meses.map((nome, i) => ({
          mes: nome,
          realizado: map.get(i + 1) ?? 0,
          meta: metaPorMes.get(i + 1) ?? 0,
          atingimento: (metaPorMes.get(i + 1) ?? 0) > 0
            ? ((map.get(i + 1) ?? 0) / (metaPorMes.get(i + 1) as number)) * 100 : 0,
        }));
        return {
          titulo: `Faturamento mensal — ${ano}`,
          geradoEm, filtros: { ano },
          columns: [
            { key: "mes", label: "Mês" },
            { key: "realizado", label: "Realizado", type: "currency" },
            { key: "meta", label: "Meta", type: "currency" },
            { key: "atingimento", label: "% Atingimento", type: "number" },
          ],
          rows,
          totais: {
            realizado: rows.reduce((s, r) => s + r.realizado, 0),
            meta: rows.reduce((s, r) => s + r.meta, 0),
          },
        };
      }
      case "desempenho_executivos": {
        const [{ data: pis }, { data: profiles }] = await Promise.all([
          supabase.from("pis").select("executivo_id, valor_negociado, total_insercoes, agencia_id").match(piMatch).gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`).not("status", "in", "(substituido,cancelado)"),
          supabase.from("profiles").select("id, nome, email"),
        ]);
        const liquido = (v: number, agenciaId: string | null | undefined) =>
          agenciaId ? Number(v || 0) * 0.8 : Number(v || 0);
        const byUser = new Map<string, { vendas: number; deals: number; insercoes: number }>();
        (pis ?? []).forEach((p: any) => {
          const k = p.executivo_id || "sem";
          const cur = byUser.get(k) ?? { vendas: 0, deals: 0, insercoes: 0 };
          cur.vendas += liquido(Number(p.valor_negociado), p.agencia_id);
          cur.deals += 1;
          cur.insercoes += Number(p.total_insercoes);
          byUser.set(k, cur);
        });
        const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.nome]));
        const rows = Array.from(byUser.entries())
          .map(([id, v]) => ({ executivo: nameById.get(id) || "Sem responsável", ...v }))
          .sort((a, b) => b.vendas - a.vendas);
        return {
          titulo: "Desempenho de executivos",
          geradoEm, filtros: { inicio, fim },
          columns: [
            { key: "executivo", label: "Executivo" },
            { key: "deals", label: "PIs", type: "number" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "vendas", label: "Vendas (líquido)", type: "currency" },
          ],
          rows,
          totais: { vendas: rows.reduce((s, r) => s + r.vendas, 0) },
        };
      }
      case "comissoes_agencias": {
        const { data: props } = await supabase
          .from("propostas")
          .select("numero, campanha, valor_negociado, comissao_pct, status, agencias(razao_social, nome_fantasia)").match(propMatch)
          .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`);
        const rows = (props ?? []).map((p: any) => {
          const val = Number(p.valor_negociado);
          const pct = Number(p.comissao_pct);
          return {
            agencia: p.agencias?.nome_fantasia || p.agencias?.razao_social || "—",
            numero: p.numero,
            campanha: p.campanha,
            valor: val,
            comissao_pct: pct,
            comissao: (val * pct) / 100,
            status: p.status,
          };
        });
        return {
          titulo: "Comissões de agências",
          geradoEm, filtros: { inicio, fim },
          columns: [
            { key: "agencia", label: "Agência" },
            { key: "numero", label: "Proposta" },
            { key: "campanha", label: "Campanha" },
            { key: "valor", label: "Valor", type: "currency" },
            { key: "comissao_pct", label: "%", type: "number" },
            { key: "comissao", label: "Comissão", type: "currency" },
            { key: "status", label: "Status" },
          ],
          rows,
          totais: { comissao: rows.reduce((s, r) => s + r.comissao, 0) },
        };
      }
      case "pi_status": {
        const { data: pis } = await supabase.from("pis").select("status, valor_negociado").match(piMatch);
        const map = new Map<string, { qtd: number; valor: number }>();
        (pis ?? []).forEach((p: any) => {
          const cur = map.get(p.status) ?? { qtd: 0, valor: 0 };
          cur.qtd += 1; cur.valor += Number(p.valor_negociado);
          map.set(p.status, cur);
        });
        const rows = Array.from(map.entries()).map(([status, v]) => ({ status, ...v }));
        return {
          titulo: "PIs por status",
          geradoEm, filtros: {},
          columns: [
            { key: "status", label: "Status" },
            { key: "qtd", label: "Quantidade", type: "number" },
            { key: "valor", label: "Valor", type: "currency" },
          ],
          rows,
        };
      }
      case "propostas_status": {
        const { data: props } = await supabase.from("propostas").select("status, valor_negociado").match(propMatch);
        const map = new Map<string, { qtd: number; valor: number }>();
        (props ?? []).forEach((p: any) => {
          const cur = map.get(p.status) ?? { qtd: 0, valor: 0 };
          cur.qtd += 1; cur.valor += Number(p.valor_negociado);
          map.set(p.status, cur);
        });
        const rows = Array.from(map.entries()).map(([status, v]) => ({ status, ...v }));
        return {
          titulo: "Propostas por status",
          geradoEm, filtros: {},
          columns: [
            { key: "status", label: "Status" },
            { key: "qtd", label: "Quantidade", type: "number" },
            { key: "valor", label: "Valor", type: "currency" },
          ],
          rows,
        };
      }
      case "projetos_especiais": {
        const { data: ps } = await supabase
          .from("projetos_especiais")
          .select("nome, cliente_alvo, valor_estimado, status, comercializacao_inicio, comercializacao_fim")
          .order("comercializacao_fim");
        const rows = (ps ?? []).map((p: any) => ({
          nome: p.nome,
          cliente: p.cliente_alvo || "—",
          inicio: p.comercializacao_inicio || "—",
          fim: p.comercializacao_fim,
          valor: Number(p.valor_estimado ?? 0),
          status: p.status,
        }));
        return {
          titulo: "Projetos especiais",
          geradoEm, filtros: {},
          columns: [
            { key: "nome", label: "Projeto" },
            { key: "cliente", label: "Cliente alvo" },
            { key: "inicio", label: "Início", type: "date" },
            { key: "fim", label: "Fim comercialização", type: "date" },
            { key: "valor", label: "Valor estimado", type: "currency" },
            { key: "status", label: "Status" },
          ],
          rows,
          totais: { valor: rows.reduce((s, r) => s + r.valor, 0) },
        };
      }
      case "metas_vs_realizado": {
        const [{ data: metas }, { data: pis }, { data: profiles }] = await Promise.all([
          supabase.from("metas_executivo").select("executivo_id, mes, valor_meta").eq("ano", ano),
          supabase.from("pis").select("executivo_id, valor_negociado, agencia_id, ano_veiculacao").match(piMatch).eq("ano_veiculacao", ano).not("status", "in", "(substituido,cancelado)"),
          supabase.from("profiles").select("id, nome"),
        ]);
        const liquido = (v: number, agenciaId: string | null | undefined) =>
          agenciaId ? Number(v || 0) * 0.8 : Number(v || 0);
        const metaByUser = new Map<string, number>();
        (metas ?? []).forEach((m: any) => metaByUser.set(m.executivo_id, (metaByUser.get(m.executivo_id) ?? 0) + Number(m.valor_meta)));
        const realByUser = new Map<string, number>();
        (pis ?? []).forEach((p: any) => realByUser.set(p.executivo_id, (realByUser.get(p.executivo_id) ?? 0) + liquido(Number(p.valor_negociado), p.agencia_id)));
        const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.nome]));
        const ids = new Set([...metaByUser.keys(), ...realByUser.keys()]);
        const rows = Array.from(ids).map((id) => {
          const meta = metaByUser.get(id) ?? 0;
          const realizado = realByUser.get(id) ?? 0;
          return {
            executivo: nameById.get(id) || "Sem responsável",
            meta, realizado,
            atingimento: meta > 0 ? (realizado / meta) * 100 : 0,
            diferenca: realizado - meta,
          };
        }).sort((a, b) => b.atingimento - a.atingimento);
        return {
          titulo: `Metas vs Realizado — ${ano}`,
          geradoEm, filtros: { ano },
          columns: [
            { key: "executivo", label: "Executivo" },
            { key: "meta", label: "Meta", type: "currency" },
            { key: "realizado", label: "Realizado (líquido)", type: "currency" },
            { key: "atingimento", label: "% Atingimento", type: "number" },
            { key: "diferenca", label: "Diferença", type: "currency" },
          ],
          rows,
        };
      }
      case "produtos_catalogo": {
        const { data: prods } = await supabase.from("produtos").select("*").order("midia").order("nome");
        const rows = (prods ?? []).map((p: any) => {
          let origem = "Próprio";
          let pCnpj = p.parceiro_cnpj;
          let pNome = p.parceiro_nome;
          if (!pCnpj && p.detalhes_venda) {
            try {
              const meta = JSON.parse(p.detalhes_venda);
              if (meta?._parceiro) {
                pCnpj = meta._parceiro.cnpj;
                pNome = meta._parceiro.nome;
              }
            } catch {}
          }
          if (pCnpj) {
            origem = `Parceiro: ${pNome || pCnpj}`;
          }
          return {
            midia: p.midia,
            nome: p.nome,
            origem,
            programa: p.programa || "—",
            faixa: p.faixa || "—",
            duracao: `${p.duracao_segundos}s`,
            insercoes: p.insercoes_padrao,
            valor: Number(p.valor_unit),
            ativo: p.ativo ? "Sim" : "Não",
          };
        });
        return {
          titulo: "Catálogo de produtos",
          geradoEm, filtros: {},
          columns: [
            { key: "midia", label: "Mídia" },
            { key: "nome", label: "Produto" },
            { key: "origem", label: "Origem" },
            { key: "programa", label: "Programa" },
            { key: "faixa", label: "Faixa" },
            { key: "duracao", label: "Duração" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "valor", label: "Valor", type: "currency" },
            { key: "ativo", label: "Ativo" },
          ],
          rows,
        };
      }
      case "investimento_clientes":
      case "investimento_agencias": {
        const isCliente = data.tipo === "investimento_clientes";
        const fk = isCliente ? "cliente_id" : "agencia_id";
        const joinTbl = isCliente ? "clientes" : "agencias";
        const { data: pis } = await supabase
          .from("pis")
          .select(`${fk}, valor_negociado, total_insercoes, periodo_inicio, created_at, ${joinTbl}(razao_social, nome_fantasia, cnpj, cidade, uf)`).match(piMatch)
          .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`)
          .not("status", "in", "(substituido,cancelado)");
        type Acc = { nome: string; cnpj: string; cidade: string; pis: number; insercoes: number; valor: number; ultimo: string };
        const map = new Map<string, Acc>();
        (pis ?? []).forEach((p: any) => {
          const id = p[fk] as string | null;
          if (!id) return;
          const ent = p[joinTbl];
          const cur = map.get(id) ?? {
            nome: ent?.nome_fantasia || ent?.razao_social || "—",
            cnpj: ent?.cnpj || "—",
            cidade: ent?.cidade ? `${ent.cidade}/${ent.uf || ""}` : "—",
            pis: 0, insercoes: 0, valor: 0, ultimo: "",
          };
          cur.pis += 1;
          cur.insercoes += Number(p.total_insercoes ?? 0);
          cur.valor += Number(p.valor_negociado ?? 0);
          const ref = (p.periodo_inicio as string | null) || (p.created_at as string).slice(0, 10);
          if (!cur.ultimo || ref > cur.ultimo) cur.ultimo = ref;
          map.set(id, cur);
        });
        const rows = Array.from(map.values())
          .map((r) => ({
            nome: r.nome, cnpj: r.cnpj, cidade: r.cidade,
            pis: r.pis, insercoes: r.insercoes,
            ticket_medio: r.pis > 0 ? r.valor / r.pis : 0,
            valor: r.valor, ultimo: r.ultimo,
          }))
          .sort((a, b) => b.valor - a.valor);
        return {
          titulo: isCliente ? "Histórico de investimento — Clientes" : "Histórico de investimento — Agências",
          geradoEm, filtros: { inicio, fim },
          columns: [
            { key: "nome", label: isCliente ? "Cliente" : "Agência" },
            { key: "cnpj", label: "CNPJ" },
            { key: "cidade", label: "Cidade" },
            { key: "pis", label: "PIs", type: "number" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "ticket_medio", label: "Ticket médio", type: "currency" },
            { key: "valor", label: "Investimento total", type: "currency" },
            { key: "ultimo", label: "Última veiculação", type: "date" },
          ],
          rows,
          totais: {
            valor: rows.reduce((s, r) => s + r.valor, 0),
            pis: rows.reduce((s, r) => s + r.pis, 0),
            insercoes: rows.reduce((s, r) => s + r.insercoes, 0),
          },
        };
      }


      case "faturamento_fiscal":
      case "notas_emitidas":
      case "contas_a_receber": {
        const isFat = data.tipo === "faturamento_fiscal";
        const isNot = data.tipo === "notas_emitidas";
        const page = data.page ?? 1;
        const pageSize = data.pageSize ?? 100;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let q = supabase
          .from("pis")
          .select(
            "numero, campanha, valor_negociado, faturamento_contra, data_faturamento, data_envio_nota, data_vencimento_nota, faturado, status, cliente_id, agencia_id, clientes(razao_social, nome_fantasia, cnpj, inscricao_estadual, cidade, uf), agencias(razao_social, nome_fantasia, cnpj, inscricao_estadual, cidade, uf)",
            { count: "estimated" },
          ).match(piMatch)
          .not("status", "in", "(substituido,cancelado)");

        if (isFat) q = q.gte("data_faturamento", inicio).lte("data_faturamento", fim).order("data_faturamento", { ascending: false });
        else if (isNot) q = q.gte("data_envio_nota", inicio).lte("data_envio_nota", fim).order("data_envio_nota", { ascending: false });
        else q = q.eq("faturado", true).gte("data_vencimento_nota", inicio).lte("data_vencimento_nota", fim).order("data_vencimento_nota", { ascending: true });

        const { data: pis, count } = await q.range(from, to);
        const rows = (pis ?? []).map((p: any) => {
          const ent = p.faturamento_contra === "agencia" ? p.agencias : p.clientes;
          return {
            numero: p.numero,
            tomador: ent?.razao_social || ent?.nome_fantasia || "—",
            cnpj: ent?.cnpj || "—",
            ie: ent?.inscricao_estadual || "—",
            uf: ent?.uf || "—",
            cidade: ent?.cidade || "—",
            campanha: p.campanha,
            valor: Number(p.valor_negociado ?? 0),
            data_faturamento: p.data_faturamento ?? "",
            data_envio_nota: p.data_envio_nota ?? "",
            data_vencimento: p.data_vencimento_nota ?? "",
            status: p.status,
          };
        });

        const baseCols = [
          { key: "numero", label: "PI" },
          { key: "tomador", label: "Tomador (Razão Social)" },
          { key: "cnpj", label: "CNPJ" },
          { key: "ie", label: "Insc. Estadual" },
          { key: "cidade", label: "Cidade" },
          { key: "uf", label: "UF" },
          { key: "campanha", label: "Campanha" },
          { key: "valor", label: "Valor", type: "currency" as const },
        ];
        const columns = isFat
          ? [...baseCols, { key: "data_faturamento", label: "Data faturamento", type: "date" as const }, { key: "data_vencimento", label: "Vencimento", type: "date" as const }]
          : isNot
          ? [...baseCols, { key: "data_envio_nota", label: "Data envio nota", type: "date" as const }, { key: "data_vencimento", label: "Vencimento", type: "date" as const }]
          : [...baseCols, { key: "data_vencimento", label: "Vencimento", type: "date" as const }, { key: "data_faturamento", label: "Data faturamento", type: "date" as const }];

        const titulo = isFat ? "Faturamento fiscal" : isNot ? "Notas emitidas" : "Contas a receber";
        return {
          titulo,
          geradoEm,
          filtros: { inicio, fim },
          columns,
          rows,
          totais: { valor: rows.reduce((s, r) => s + r.valor, 0) },
          paginacao: { page, pageSize, total: count ?? rows.length },
        };
      }

      case "pis_consultados": {
        const page = data.page ?? 1;
        const pageSize = data.pageSize ?? 50;
        const HARD_CAP = 20000;
        const fimTs = `${fim}T23:59:59`;

        // 1) Fetch only access events in the period, indexed by (acao, created_at)
        const { data: aberturas, count: totalAberturas } = await supabase
          .from("pi_historico")
          .select("pi_id, user_id, created_at", { count: "estimated" })
          .eq("acao", "abertura_link_compartilhado")
          .gte("created_at", inicio).lte("created_at", fimTs)
          .order("created_at", { ascending: false })
          .range(0, HARD_CAP - 1);

        const truncado = (totalAberturas ?? 0) > HARD_CAP;

        // Aggregate per PI
        type Acc = { acessos: number; usuarios: Set<string>; primeiro?: string; ultimo?: string; envio?: string };
        const map = new Map<string, Acc>();
        (aberturas ?? []).forEach((h: any) => {
          const cur = map.get(h.pi_id) ?? { acessos: 0, usuarios: new Set<string>() };
          cur.acessos += 1;
          if (h.user_id) cur.usuarios.add(h.user_id);
          if (!cur.primeiro || h.created_at < cur.primeiro) cur.primeiro = h.created_at;
          if (!cur.ultimo || h.created_at > cur.ultimo) cur.ultimo = h.created_at;
          map.set(h.pi_id, cur);
        });

        const piIds = Array.from(map.keys());
        const total = piIds.length;

        const baseColumns: Relatorio["columns"] = [
          { key: "numero", label: "PI" },
          { key: "campanha", label: "Campanha" },
          { key: "cliente", label: "Cliente / Agência" },
          { key: "executivo", label: "Executivo" },
          { key: "acessos", label: "Acessos", type: "number" },
          { key: "usuarios_distintos", label: "Usuários distintos", type: "number" },
          { key: "primeiro_acesso", label: "1º acesso", type: "text" },
          { key: "ultimo_acesso", label: "Último acesso", type: "text" },
          { key: "data_envio", label: "Envio do link", type: "text" },
          { key: "dias_desde_envio", label: "Dias desde envio", type: "number" },
          { key: "tempo_ate_1o_acesso_h", label: "Horas até 1º acesso", type: "number" },
        ];

        if (total === 0) {
          return {
            titulo: "PIs consultados (links compartilhados)",
            geradoEm, filtros: { inicio, fim },
            columns: baseColumns, rows: [],
            paginacao: { page, pageSize, total: 0, truncado },
          };
        }

        // 2) Sort aggregated rows by acessos desc; paginate before any extra lookup
        const sortedIds = piIds.sort((a, b) => (map.get(b)!.acessos - map.get(a)!.acessos));
        const offset = (page - 1) * pageSize;
        const pageIds = sortedIds.slice(offset, offset + pageSize);

        // 3) Fetch PI/profile metadata and envio dates only for the page (uses pi_id index)
        const [{ data: pis }, { data: envios }] = await Promise.all([
          supabase
            .from("pis")
            .select("id, numero, campanha, executivo_id, clientes(razao_social, nome_fantasia), agencias(razao_social, nome_fantasia)").match(piMatch)
            .in("id", pageIds),
          supabase
            .from("pi_historico")
            .select("pi_id, created_at")
            .in("pi_id", pageIds)
            .in("acao", ["envio_link_email", "envio_link_whatsapp"])
            .order("created_at", { ascending: true }),
        ]);

        (envios ?? []).forEach((e: any) => {
          const cur = map.get(e.pi_id);
          if (cur && (!cur.envio || e.created_at < cur.envio)) cur.envio = e.created_at;
        });

        const execIds = Array.from(new Set((pis ?? []).map((p: any) => p.executivo_id).filter(Boolean)));
        const { data: profiles } = execIds.length
          ? await supabase.from("profiles").select("id, nome").in("id", execIds)
          : { data: [] as any[] };
        const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.nome]));
        const piById = new Map((pis ?? []).map((p: any) => [p.id, p]));

        const fmt = (d?: string) => d ? new Date(d).toLocaleString("pt-BR") : "—";
        const daysBetween = (a?: string, b?: string) => (a && b) ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)) : 0;
        const hoursBetween = (a?: string, b?: string) => (a && b) ? Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 3600000 * 10) / 10) : 0;
        const nowIso = new Date().toISOString();

        const rows = pageIds.map((pid) => {
          const v = map.get(pid)!;
          const p: any = piById.get(pid);
          const cliente = p?.clientes?.nome_fantasia || p?.clientes?.razao_social || p?.agencias?.nome_fantasia || p?.agencias?.razao_social || "—";
          return {
            numero: p?.numero || "—",
            campanha: p?.campanha || "—",
            cliente,
            executivo: nameById.get(p?.executivo_id) || "Sem responsável",
            acessos: v.acessos,
            usuarios_distintos: v.usuarios.size,
            primeiro_acesso: fmt(v.primeiro),
            ultimo_acesso: fmt(v.ultimo),
            data_envio: fmt(v.envio),
            dias_desde_envio: daysBetween(v.envio, nowIso),
            tempo_ate_1o_acesso_h: hoursBetween(v.envio, v.primeiro),
          };
        });

        return {
          titulo: "PIs consultados (links compartilhados)",
          geradoEm, filtros: { inicio, fim },
          columns: baseColumns,
          rows,
          totais: {
            acessos_pagina: rows.reduce((s, r) => s + r.acessos, 0),
            pis_consultados_total: total,
          },
          paginacao: { page, pageSize, total, truncado },
        };

      }

      case "vendas_executivo_detalhado": {
        const page = data.page ?? 1;
        const pageSize = data.pageSize ?? 100;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const [{ data: pis, count }, { data: profiles }] = await Promise.all([
          supabase
            .from("pis")
            .select("numero, campanha, executivo_id, agencia_id, valor_negociado, total_insercoes, periodo_inicio, periodo_fim, status, clientes(razao_social, nome_fantasia), agencias(razao_social, nome_fantasia)", { count: "estimated" }).match(piMatch)
            .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`)
            .not("status", "in", "(substituido,cancelado)")
            .order("executivo_id", { ascending: true })
            .order("created_at", { ascending: false })
            .range(from, to),
          supabase.from("profiles").select("id, nome, email"),
        ]);
        const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.nome || p.email]));
        const rows = (pis ?? []).map((p: any) => {
          const valor = Number(p.valor_negociado ?? 0);
          const liquido = p.agencia_id ? valor * 0.8 : valor;
          return {
            executivo: nameById.get(p.executivo_id) || "Sem responsável",
            numero: p.numero,
            cliente: p.clientes?.nome_fantasia || p.clientes?.razao_social || "—",
            agencia: p.agencias?.nome_fantasia || p.agencias?.razao_social || "—",
            campanha: p.campanha || "—",
            inicio: p.periodo_inicio || "—",
            fim: p.periodo_fim || "—",
            insercoes: Number(p.total_insercoes ?? 0),
            valor_bruto: valor,
            valor_liquido: liquido,
            status: p.status,
          };
        }).sort((a, b) => a.executivo.localeCompare(b.executivo) || b.valor_bruto - a.valor_bruto);
        return {
          titulo: "Vendas detalhadas por executivo",
          geradoEm, filtros: { inicio, fim },
          columns: [
            { key: "executivo", label: "Executivo" },
            { key: "numero", label: "PI" },
            { key: "cliente", label: "Cliente" },
            { key: "agencia", label: "Agência" },
            { key: "campanha", label: "Campanha" },
            { key: "inicio", label: "Início", type: "date" },
            { key: "fim", label: "Fim", type: "date" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "valor_bruto", label: "Valor bruto", type: "currency" },
            { key: "valor_liquido", label: "Valor líquido", type: "currency" },
            { key: "status", label: "Status" },
          ],
          rows,
          totais: {
            valor_bruto: rows.reduce((s, r) => s + r.valor_bruto, 0),
            valor_liquido: rows.reduce((s, r) => s + r.valor_liquido, 0),
            insercoes: rows.reduce((s, r) => s + r.insercoes, 0),
          },
          paginacao: { page, pageSize, total: count ?? rows.length },
        };
      }

      case "desempenho_executivo_completo": {
        const [{ data: pis }, { data: propostas }, { data: metas }, { data: profiles }] = await Promise.all([
          supabase
            .from("pis")
            .select("executivo_id, valor_negociado, total_insercoes, agencia_id, status, created_at").match(piMatch)
            .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`),
          supabase
            .from("propostas")
            .select("executivo_id, valor_negociado, status, created_at").match(propMatch)
            .gte("created_at", inicio).lte("created_at", `${fim}T23:59:59`),
          supabase.from("metas_executivo").select("executivo_id, valor_meta, ano, mes").eq("ano", ano),
          supabase.from("profiles").select("id, nome, email"),
        ]);

        const liquido = (v: number, agenciaId: string | null | undefined) =>
          agenciaId ? Number(v || 0) * 0.8 : Number(v || 0);

        type Stat = {
          pis_total: number;
          pis_aprovados: number;
          pis_cancelados: number;
          insercoes: number;
          bruto: number;
          liquido: number;
          propostas_total: number;
          propostas_ganhas: number;
          propostas_perdidas: number;
          valor_proposto: number;
          meta: number;
        };
        const make = (): Stat => ({
          pis_total: 0, pis_aprovados: 0, pis_cancelados: 0, insercoes: 0,
          bruto: 0, liquido: 0, propostas_total: 0, propostas_ganhas: 0,
          propostas_perdidas: 0, valor_proposto: 0, meta: 0,
        });
        const by = new Map<string, Stat>();
        const get = (k: string) => { let s = by.get(k); if (!s) { s = make(); by.set(k, s); } return s; };

        (pis ?? []).forEach((p: any) => {
          const k = p.executivo_id || "sem";
          const s = get(k);
          s.pis_total += 1;
          if (p.status === "cancelado" || p.status === "substituido") { s.pis_cancelados += 1; return; }
          if (["aprovado", "faturado", "veiculado", "encerrado"].includes(p.status)) s.pis_aprovados += 1;
          s.insercoes += Number(p.total_insercoes ?? 0);
          s.bruto += Number(p.valor_negociado ?? 0);
          s.liquido += liquido(Number(p.valor_negociado), p.agencia_id);
        });
        (propostas ?? []).forEach((p: any) => {
          const k = p.executivo_id || "sem";
          const s = get(k);
          s.propostas_total += 1;
          s.valor_proposto += Number(p.valor_negociado ?? 0);
          if (p.status === "aprovada" || p.status === "ganha" || p.status === "convertida") s.propostas_ganhas += 1;
          if (p.status === "perdida" || p.status === "recusada") s.propostas_perdidas += 1;
        });
        (metas ?? []).forEach((m: any) => {
          const s = get(m.executivo_id || "sem");
          s.meta += Number(m.valor_meta ?? 0);
        });

        const nameById = new Map((profiles ?? []).map((p: any) => [p.id, p.nome || p.email]));
        const rows = Array.from(by.entries()).map(([id, s]) => ({
          executivo: nameById.get(id) || "Sem responsável",
          pis_total: s.pis_total,
          pis_aprovados: s.pis_aprovados,
          propostas_total: s.propostas_total,
          propostas_ganhas: s.propostas_ganhas,
          taxa_conversao: s.propostas_total > 0 ? (s.propostas_ganhas / s.propostas_total) * 100 : 0,
          insercoes: s.insercoes,
          ticket_medio: s.pis_aprovados > 0 ? s.liquido / s.pis_aprovados : 0,
          bruto: s.bruto,
          liquido: s.liquido,
          meta: s.meta,
          atingimento: s.meta > 0 ? (s.liquido / s.meta) * 100 : 0,
        })).sort((a, b) => b.liquido - a.liquido);

        return {
          titulo: "Desempenho completo por executivo",
          geradoEm, filtros: { inicio, fim, ano },
          columns: [
            { key: "executivo", label: "Executivo" },
            { key: "pis_total", label: "PIs", type: "number" },
            { key: "pis_aprovados", label: "PIs aprovados", type: "number" },
            { key: "propostas_total", label: "Propostas", type: "number" },
            { key: "propostas_ganhas", label: "Ganhas", type: "number" },
            { key: "taxa_conversao", label: "Conversão %", type: "number" },
            { key: "insercoes", label: "Inserções", type: "number" },
            { key: "ticket_medio", label: "Ticket médio", type: "currency" },
            { key: "bruto", label: "Bruto", type: "currency" },
            { key: "liquido", label: "Líquido", type: "currency" },
            { key: "meta", label: "Meta", type: "currency" },
            { key: "atingimento", label: "Atingimento %", type: "number" },
          ],
          rows,
          totais: {
            pis_total: rows.reduce((s, r) => s + r.pis_total, 0),
            pis_aprovados: rows.reduce((s, r) => s + r.pis_aprovados, 0),
            propostas_total: rows.reduce((s, r) => s + r.propostas_total, 0),
            propostas_ganhas: rows.reduce((s, r) => s + r.propostas_ganhas, 0),
            insercoes: rows.reduce((s, r) => s + r.insercoes, 0),
            bruto: rows.reduce((s, r) => s + r.bruto, 0),
            liquido: rows.reduce((s, r) => s + r.liquido, 0),
            meta: rows.reduce((s, r) => s + r.meta, 0),
          },
        };
      }
    }
  });


