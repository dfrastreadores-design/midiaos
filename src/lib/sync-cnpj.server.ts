import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchCnpj, onlyDigits } from "@/lib/cnpj";

const TABELAS = ["clientes", "agencias"] as const;
type Tabela = (typeof TABELAS)[number];

// Janela permitida em horário de Brasília (UTC-3): 00:01 → 05:55
function dentroDaJanela(now: Date = new Date()): boolean {
  // Converte para minutos desde a meia-noite de Brasília
  const brasiliaMs = now.getTime() - 3 * 60 * 60 * 1000;
  const d = new Date(brasiliaMs);
  const minutos = d.getUTCHours() * 60 + d.getUTCMinutes();
  return minutos >= 1 && minutos <= 5 * 60 + 55;
}

const CAMPOS_MAP: Record<string, (d: Awaited<ReturnType<typeof fetchCnpj>>) => unknown> = {
  razao_social: (d) => d.razaoSocial || null,
  nome_fantasia: (d) => d.nomeFantasia || null,
  endereco: (d) => [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ") || null,
  cidade: (d) => d.cidade || null,
  uf: (d) => d.estado || null,
  cep: (d) => d.cep || null,
  inscricao_estadual: (d) => d.inscricaoEstadual || null,
  inscricao_municipal: (d) => d.inscricaoMunicipal || null,
  cnae: (d) => d.cnae || null,
  situacao_cadastral: (d) => d.situacaoCadastral || null,
};

async function proximaEntidade(tabela: Tabela) {
  const { data, error } = await supabaseAdmin
    .from(tabela)
    .select("id, razao_social, cnpj, nome_fantasia, endereco, cidade, uf, cep, inscricao_estadual, inscricao_municipal, cnae, situacao_cadastral, cnpj_sync_at")
    .not("cnpj", "is", null)
    .order("cnpj_sync_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function escolherProxima(): Promise<{ tabela: Tabela; row: any } | null> {
  // alterna: pega o registro mais antigo entre clientes e agências
  const [cli, ag] = await Promise.all([proximaEntidade("clientes"), proximaEntidade("agencias")]);
  if (!cli && !ag) return null;
  if (!cli) return { tabela: "agencias", row: ag };
  if (!ag) return { tabela: "clientes", row: cli };
  const tCli = cli.cnpj_sync_at ? new Date(cli.cnpj_sync_at).getTime() : 0;
  const tAg = ag.cnpj_sync_at ? new Date(ag.cnpj_sync_at).getTime() : 0;
  return tCli <= tAg ? { tabela: "clientes", row: cli } : { tabela: "agencias", row: ag };
}

export async function executarSyncCnpjPasso() {
  if (!dentroDaJanela()) {
    return { ok: true, skipped: true, reason: "fora_janela" as const };
  }
  const alvo = await escolherProxima();
  if (!alvo) return { ok: true, processed: 0 };
  const { tabela, row } = alvo;
  const tipo = tabela === "clientes" ? "cliente" : "agencia";
  const digits = onlyDigits(row.cnpj ?? "");
  const marcarSync = async () => {
    await supabaseAdmin.from(tabela).update({ cnpj_sync_at: new Date().toISOString() } as never).eq("id", row.id);
  };

  if (digits.length !== 14) {
    await supabaseAdmin.from("sync_cnpj_log").insert({
      entidade_tipo: tipo, entidade_id: row.id, cnpj: row.cnpj, razao_social: row.razao_social,
      status: "ignorado", mensagem: "CNPJ inválido",
    } as never);
    await marcarSync();
    return { ok: true, processed: 1, status: "ignorado", id: row.id };
  }

  try {
    const dados = await fetchCnpj(digits);
    const updates: Record<string, unknown> = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const [campo, getter] of Object.entries(CAMPOS_MAP)) {
      const novo = getter(dados);
      const atual = (row as Record<string, unknown>)[campo] ?? null;
      const a = atual === "" ? null : atual;
      const n = novo === "" ? null : novo;
      if ((a ?? null) !== (n ?? null) && n !== null && n !== undefined) {
        updates[campo] = n;
        changes[campo] = { old: a, new: n };
      }
    }
    if (Object.keys(updates).length > 0) {
      updates.cnpj_sync_at = new Date().toISOString();
      const { error } = await supabaseAdmin.from(tabela).update(updates as never).eq("id", row.id);
      if (error) throw new Error(error.message);
      await supabaseAdmin.from("sync_cnpj_log").insert({
        entidade_tipo: tipo, entidade_id: row.id, cnpj: row.cnpj, razao_social: updates.razao_social ?? row.razao_social,
        status: "atualizado", campos_alterados: changes as never,
        mensagem: `${Object.keys(changes).length} campo(s) atualizado(s)`,
      } as never);
      return { ok: true, processed: 1, status: "atualizado", id: row.id };
    }
    await marcarSync();
    await supabaseAdmin.from("sync_cnpj_log").insert({
      entidade_tipo: tipo, entidade_id: row.id, cnpj: row.cnpj, razao_social: row.razao_social,
      status: "sem_alteracao", mensagem: "Dados conferidos — nenhuma divergência",
    } as never);
    return { ok: true, processed: 1, status: "sem_alteracao", id: row.id };
  } catch (e) {
    await marcarSync();
    await supabaseAdmin.from("sync_cnpj_log").insert({
      entidade_tipo: tipo, entidade_id: row.id, cnpj: row.cnpj, razao_social: row.razao_social,
      status: "erro", mensagem: (e as Error).message?.slice(0, 500) ?? "Erro desconhecido",
    } as never);
    return { ok: true, processed: 1, status: "erro", id: row.id };
  }
}
