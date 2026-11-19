import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ContatoSchema = z.object({
  nome: z.string().max(120),
  cargo: z.string().max(120).optional().default(""),
  funcao: z.string().max(120).optional().default(""),
  email: z.string().max(200).optional().default(""),
  telefone: z.string().max(40).optional().default(""),
  aniversario: z
    .string()
    .max(5)
    .regex(/^(\d{2}\/\d{2})?$/)
    .optional()
    .default(""),
  // Metadados enriquecidos do Midia OS Prospect (Fase 1)
  departamento: z.string().max(80).optional().default(""),
  tipo_canal: z.enum(["whatsapp", "email", "telefone", "telefone_fixo", "linkedin", "outro"]).optional().default("email"),
  fonte_origem: z.string().max(100).optional().default(""),
  url_fonte: z.string().max(500).optional().default(""),
  coletado_em: z.string().optional(),
  atualizado_em: z.string().optional(),
  confiabilidade: z.enum(["baixa", "media", "alta", "verificada"]).optional().default("media"),
  situacao_contato: z.enum(["ativo", "bloqueado_optout", "invalido", "desatualizado"]).optional().default("ativo"),
});

const ClienteSchema = z.object({
  id: z.string().uuid().optional(),
  razao_social: z.string().min(1).max(200),
  nome_fantasia: z.string().max(200).nullable().optional(),
  apelido: z.string().max(200).nullable().optional(),
  cnpj: z.string().max(20).nullable().optional(),
  endereco: z.string().max(300).nullable().optional(),
  cidade: z.string().max(120).nullable().optional(),
  uf: z.string().max(2).nullable().optional(),
  cep: z.string().max(15).nullable().optional(),
  agencia_id: z.string().uuid().nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
  logo_url: z.string().max(500).nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
  segmento: z.string().max(120).nullable().optional(),
  inscricao_estadual: z.string().max(40).nullable().optional(),
  inscricao_municipal: z.string().max(40).nullable().optional(),
  cnae: z.string().max(300).nullable().optional(),
  situacao_cadastral: z.string().max(60).nullable().optional(),
  website: z.string().max(255).nullable().optional(),
  instagram: z.string().max(255).nullable().optional(),
  linkedin: z.string().max(255).nullable().optional(),
  facebook: z.string().max(255).nullable().optional(),
  data_aniversario: z
    .string()
    .regex(/^\d{2}\/\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(["ativo", "inativo", "prospect", "bloqueado"]).optional().default("ativo"),
  indicador_id: z.string().uuid().nullable().optional(),
  comissao_indicacao_pct: z.number().min(0).max(100).nullable().optional(),
  contatos: z.array(ContatoSchema).default([]),
});

import { isMasterEmail } from "@/lib/master-user";

async function resolveClientAuth(supabase: any, userId: string) {
  const [{ data: userAuth }, { data: prof }, { data: roleRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const email = userAuth?.user?.email;
  const isMaster = isMasterEmail(email);
  const tenantId = prof?.tenant_id ?? null;
  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  const hasBroadRole =
    isMaster ||
    roles.some((r: string) =>
      ["admin", "master_empresa", "diretoria", "super_admin"].includes(r),
    );

  return { isMaster, tenantId, roles, hasBroadRole };
}

export const listClientes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { isMaster, tenantId, hasBroadRole } = await resolveClientAuth(supabase, userId);

    if (!isMaster && !tenantId) {
      throw new Error("Acesso negado: Usuário sem empresa associada no servidor.");
    }

    let query = supabase
      .from("clientes")
      .select("*, agencia:agencias(id,razao_social,nome_fantasia)")
      .order("razao_social");

    if (!isMaster) {
      query = query.eq("tenant_id", tenantId);

      // REGRA: Executivo Comercial acessa apenas os clientes de sua carteira (atribuídos ou criados por ele)
      if (!hasBroadRole) {
        query = query.or(`executivo_id.eq.${userId},created_by.eq.${userId}`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ClienteSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isMaster, tenantId, hasBroadRole } = await resolveClientAuth(supabase, userId);

    if (!isMaster && !tenantId) {
      throw new Error("Acesso negado: Usuário sem empresa associada no servidor.");
    }

    const { id, contatos, ...rest } = data;
    const payload: Record<string, unknown> = {
      ...rest,
      contatos: contatos as unknown as never,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    };

    if (id) {
      // 1. Validar se o cliente existe e pertence ao mesmo tenant
      const { data: existente, error: fetchErr } = await supabase
        .from("clientes")
        .select("id, tenant_id, executivo_id, created_by")
        .eq("id", id)
        .maybeSingle();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!existente) throw new Error("Cliente não encontrado.");

      if (!isMaster) {
        if (existente.tenant_id && existente.tenant_id !== tenantId) {
          throw new Error("Acesso negado: Cliente pertence a outra organização.");
        }
        // Se for executivo (sem broad role), valida titularidade
        if (!hasBroadRole) {
          const isOwner =
            existente.executivo_id === userId || existente.created_by === userId;
          if (!isOwner) {
            throw new Error("Acesso negado: Este cliente não pertence à sua carteira.");
          }
        }
      }

      const { error } = await supabase
        .from("clientes")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }

    const { data: created, error } = await supabase
      .from("clientes")
      .insert({ ...payload, created_by: userId, executivo_id: rest.executivo_id || userId } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { isMaster, tenantId, hasBroadRole } = await resolveClientAuth(supabase, userId);

    if (!isMaster && !tenantId) {
      throw new Error("Acesso negado: Usuário sem empresa associada no servidor.");
    }

    // 1. Validar tenant e titularidade antes de qualquer exclusão/desativação
    const { data: clienteAtual, error: fetchErr } = await supabase
      .from("clientes")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr) throw new Error(fetchErr.message);
    if (!clienteAtual) throw new Error("Cliente não encontrado.");

    if (!isMaster) {
      if (clienteAtual.tenant_id && clienteAtual.tenant_id !== tenantId) {
        throw new Error("Acesso negado: Cliente pertence a outra organização.");
      }
      if (!hasBroadRole) {
        const isOwner =
          clienteAtual.executivo_id === userId || clienteAtual.created_by === userId;
        if (!isOwner) {
          throw new Error("Acesso negado: Você não pode desativar um cliente de outro executivo.");
        }
      }
    }

    // 1. Verificar se o cliente possui vínculos com propostas, PIs, contratos ou campanhas
    const [propsRes, pisRes, contratosRes] = await Promise.all([
      supabase.from("propostas").select("id").eq("cliente_id", data.id).limit(1),
      supabase.from("pis").select("id").eq("cliente_id", data.id).limit(1),
      supabase.from("contratos").select("id").eq("cliente_id", data.id).limit(1),
    ]);

    const temPropostas = (propsRes.data?.length ?? 0) > 0;
    const temPis = (pisRes.data?.length ?? 0) > 0;
    const temContratos = (contratosRes.data?.length ?? 0) > 0;
    const temVinculos = temPropostas || temPis || temContratos;

    if (temVinculos) {
      // Política de Zero Perda de Dados (AGENTS.md): Não deletar registros com histórico financeiro/operacional
      const { error: updErr } = await (supabase.from("clientes") as any)
        .update({
          status: "inativo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (updErr) throw new Error(updErr.message);

      const detalhes = [
        temPropostas ? "propostas" : null,
        temPis ? "pedidos de inserção (PI)" : null,
        temContratos ? "contratos" : null,
      ]
        .filter(Boolean)
        .join(", ");

      return {
        ok: true,
        softDeleted: true,
        message: `O cliente possui vínculos obrigatórios em outros cadastros (${detalhes}). O cadastro foi arquivado e desativado com sucesso para preservar o histórico.`,
      };
    }

    // 2. Se não possui vínculos conhecidos, tenta excluir gravando snapshot na lixeira lógica
    try {
      // Capturar dados antes da exclusão para snapshot em trash_items
      const { data: clienteAtual } = await supabase
        .from("clientes")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();

      if (clienteAtual) {
        await (supabase.from("trash_items") as any).insert({
          tabela_origem: "clientes",
          registro_id: data.id,
          tenant_id: (clienteAtual as any).tenant_id || null,
          dados_snapshot_jsonb: clienteAtual,
          deleted_by: userId,
        }).catch(() => null);
      }

      const { error } = await supabase.from("clientes").delete().eq("id", data.id);
      if (error) {
        // Se ainda assim disparar violação de foreign key (ex: tabela terciária)
        if (error.code === "23503" || error.message.toLowerCase().includes("foreign key")) {
          await (supabase.from("clientes") as any)
            .update({ status: "inativo", updated_at: new Date().toISOString() })
            .eq("id", data.id);

          return {
            ok: true,
            softDeleted: true,
            message: "O cliente possui vínculos operacionais em outros módulos e foi arquivado/desativado com sucesso.",
          };
        }
        throw new Error(error.message);
      }

      return { ok: true, softDeleted: false, message: "Cliente excluído com sucesso." };
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes("foreign key")) {
        await (supabase.from("clientes") as any)
          .update({ status: "inativo", updated_at: new Date().toISOString() })
          .eq("id", data.id);

        return {
          ok: true,
          softDeleted: true,
          message: "O cliente possui vínculos operacionais e foi arquivado/desativado com sucesso.",
        };
      }
      throw err;
    }
  });
