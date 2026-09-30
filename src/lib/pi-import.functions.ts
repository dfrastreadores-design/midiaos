import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchCnpj, onlyDigits } from "@/lib/cnpj";

const EntidadeSchema = z
  .object({
    razao_social: z.string().nullable().optional(),
    cnpj: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const InputSchema = z.object({
  cliente: EntidadeSchema,
  agencia: EntidadeSchema,
});

type ResolveResult = {
  cliente_id: string | null;
  agencia_id: string | null;
  cliente_criado: boolean;
  agencia_criada: boolean;
  cliente_nome?: string | null;
  agencia_nome?: string | null;
};

async function resolverOuCriar(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  tabela: "clientes" | "agencias",
  userId: string,
  entidade: { razao_social?: string | null; cnpj?: string | null } | null | undefined,
  agenciaIdParaCliente?: string | null,
): Promise<{ id: string | null; criado: boolean; nome: string | null }> {
  if (!entidade) return { id: null, criado: false, nome: null };
  const cnpjDigits = entidade.cnpj ? onlyDigits(entidade.cnpj) : "";
  const razao = (entidade.razao_social || "").trim();
  if (!cnpjDigits && !razao) return { id: null, criado: false, nome: null };

  // Tenta achar por CNPJ (qualquer formato)
  if (cnpjDigits.length === 14) {
    const { data: byCnpj } = await supabase.from(tabela).select("id, razao_social, cnpj").limit(50);
    const match = (byCnpj ?? []).find(
      (r: { cnpj: string | null }) => r.cnpj && onlyDigits(r.cnpj) === cnpjDigits,
    );
    if (match) return { id: match.id, criado: false, nome: match.razao_social };
  }
  // Tenta achar por razão social exata
  if (razao) {
    const { data: byRazao } = await supabase
      .from(tabela)
      .select("id, razao_social")
      .ilike("razao_social", razao)
      .limit(1)
      .maybeSingle();
    if (byRazao) return { id: byRazao.id, criado: false, nome: byRazao.razao_social };
  }

  // Cria — enriquece com Receita quando CNPJ válido
  const payload: Record<string, unknown> = {
    razao_social: razao || "(Sem razão social)",
    cnpj: cnpjDigits.length === 14 ? cnpjDigits : entidade.cnpj || null,
    created_by: userId,
    executivo_id: userId,
    contatos: [],
  };
  if (tabela === "clientes" && agenciaIdParaCliente) {
    payload.agencia_id = agenciaIdParaCliente;
  }
  if (cnpjDigits.length === 14) {
    try {
      const d = await fetchCnpj(cnpjDigits);
      payload.razao_social = d.razaoSocial || payload.razao_social;
      payload.nome_fantasia = d.nomeFantasia || null;
      payload.endereco = [d.logradouro, d.numero, d.bairro].filter(Boolean).join(", ") || null;
      payload.cidade = d.cidade || null;
      payload.uf = d.estado || null;
      payload.cep = d.cep || null;
      payload.inscricao_estadual = d.inscricaoEstadual || null;
      payload.inscricao_municipal = d.inscricaoMunicipal || null;
      payload.cnae = d.cnae || null;
      payload.situacao_cadastral = d.situacaoCadastral || null;
    } catch {
      // segue com o mínimo
    }
  }
  const { data: created, error } = await supabase
    .from(tabela)
    .insert(payload as never)
    .select("id, razao_social")
    .single();
  if (error) throw new Error(`Falha ao cadastrar ${tabela}: ${error.message}`);
  return { id: created.id, criado: true, nome: created.razao_social };
}

export const resolverEntidadesPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }): Promise<ResolveResult> => {
    const { supabase, userId } = context;
    // Resolve agência primeiro (para vincular ao cliente)
    const ag = await resolverOuCriar(supabase, "agencias", userId, data.agencia ?? null);
    const cli = await resolverOuCriar(supabase, "clientes", userId, data.cliente ?? null, ag.id);
    return {
      cliente_id: cli.id,
      agencia_id: ag.id,
      cliente_criado: cli.criado,
      agencia_criada: ag.criado,
      cliente_nome: cli.nome,
      agencia_nome: ag.nome,
    };
  });
