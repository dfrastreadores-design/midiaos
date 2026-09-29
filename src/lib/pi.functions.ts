import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchCnpj, onlyDigits } from "@/lib/cnpj";
import { assertAnyRole } from "@/lib/roles.server";

type SupabaseLike = {
  from: (t: string) => {
    select: (s: string) => {
      eq: (
        c: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
    };
    update: (p: Record<string, unknown>) => {
      eq: (c: string, v: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/** Atualiza cadastro de cliente/agência a partir do CNPJ. Silencioso em caso de falha. */
async function refreshEntidadeFromCnpj(
  supabase: SupabaseLike,
  table: "clientes" | "agencias",
  id: string | null | undefined,
) {
  if (!id) return;
  try {
    const { data: row } = await supabase.from(table).select("cnpj").eq("id", id).maybeSingle();
    const cnpj = (row?.cnpj as string | undefined) ?? "";
    if (!cnpj || onlyDigits(cnpj).length !== 14) return;
    // Timeout de 6s para não travar o salvamento se a Receita estiver lenta
    const info = await Promise.race([
      fetchCnpj(cnpj),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout cnpj")), 6000)),
    ]);
    const endereco = [info.logradouro, info.numero, info.bairro].filter(Boolean).join(", ");
    const patch: Record<string, unknown> = {
      razao_social: info.razaoSocial || undefined,
      nome_fantasia: info.nomeFantasia || undefined,
      endereco: endereco || undefined,
      cidade: info.cidade || undefined,
      uf: info.estado || undefined,
      cep: info.cep || undefined,
      inscricao_estadual: info.inscricaoEstadual || undefined,
      inscricao_municipal: info.inscricaoMunicipal || undefined,
      updated_at: new Date().toISOString(),
    };
    Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);
    if (Object.keys(patch).length === 0) return;
    const { error } = await supabase.from(table).update(patch).eq("id", id);
    if (error) console.warn(`[refreshEntidade] update ${table} falhou:`, error.message);
  } catch (e) {
    console.warn(`[refreshEntidade] ${table} ${id}:`, (e as Error).message);
  }
}

/** Roda refresh de cliente + agência em paralelo. */
export async function refreshPartesPi(
  supabase: SupabaseLike,
  cliente_id: string | null | undefined,
  agencia_id: string | null | undefined,
) {
  await Promise.all([
    refreshEntidadeFromCnpj(supabase, "clientes", cliente_id),
    refreshEntidadeFromCnpj(supabase, "agencias", agencia_id),
  ]);
}

const ItemSchema = z.object({
  tipo: z.string(),
  programa: z.string().nullable().optional(),
  horario: z.string().nullable().optional(),
  formato: z.string().nullable().optional(),
  insercoes_dia: z.number().int().nonnegative(),
  dias_semana: z.array(z.string()),
  dias_mes: z.array(z.number().int()),
  mes: z.number().int().min(1).max(12).optional(),
  ano: z.number().int().min(2020).max(2100).optional(),
  desconto: z.number(),
  valor_unit: z.number(),
  valor_tabela: z.number(),
  valor_negociado: z.number(),
  total_insercoes: z.number().int(),
});

const PiSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().nullable(),
  agencia_id: z.string().uuid().nullable(),
  campanha: z.string().min(1).max(200),
  mes_veiculacao: z.number().int().min(1).max(12),
  ano_veiculacao: z.number().int().min(2020).max(2100),
  mes_meta: z.number().int().min(1).max(12).nullable().optional(),
  ano_meta: z.number().int().min(2020).max(2100).nullable().optional(),
  periodo_inicio: z.string().nullable().optional(),
  periodo_fim: z.string().nullable().optional(),
  observacao: z.string().nullable().optional(),
  status: z.enum([
    "rascunho",
    "enviado",
    "aguardando_aprovacao",
    "aprovado",
    "reprovado",
    "faturado",
    "veiculado",
    "encerrado",
    "finalizado",
    "cancelado",
    "substituido",
    "aguardando_assinatura",
    "assinado",
    "enviar_opec",
  ]),
  valor_tabela: z.number(),
  valor_desconto: z.number(),
  valor_negociado: z.number(),
  valor_manual: z.number().nullable().optional(),
  total_insercoes: z.number().int(),
  faturamento_contra: z.enum(["cliente", "agencia"]).default("cliente"),
  faturamento_tipo: z.enum(["bruto", "liquido"]).default("bruto"),
  data_faturamento: z.string().nullable().optional(),
  data_envio_nota: z.string().nullable().optional(),
  data_vencimento_nota: z.string().nullable().optional(),
  vencimento_tipo: z.string().default("manual"),
  permuta: z.boolean().default(false),
  permuta_detalhes: z.string().nullable().optional(),
  permuta_uso: z.enum(["empresa", "comercial"]).nullable().optional(),
  permuta_valor_faturado: z.number().min(0).default(0),
  valor_opec: z.number().nullable().optional(),
  email_faturamento: z.string().nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
  responsavel_negociacao_id: z.string().uuid().nullable().optional(),
  executivo_execucao_id: z.string().uuid().nullable().optional(),
  producao_tipo: z.enum(["cliente", "interna"]).nullable().optional(),
  producao_contato: z.string().nullable().optional(),
  producao_data: z.string().nullable().optional(),
  producao_material_tipo: z.string().nullable().optional(),
  producao_localizacao: z.string().nullable().optional(),
  producao_observacoes: z.string().nullable().optional(),
  producao_email: z.string().nullable().optional(),
  emissora_id: z.string().uuid().nullable().optional(),
  sem_comissao: z.boolean().optional().default(false),
  itens: z.array(ItemSchema),
  investimentos_mensais: z.record(z.string(), z.number()).nullable().optional(),
});

type PiItemInput = z.infer<typeof ItemSchema>;

const normalizeItemString = (value: unknown) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

const normalizeItemNumber = (value: unknown) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? Math.round(n * 10000) / 10000 : 0;
};

function dedupePiItens<T extends PiItemInput>(itens: T[]) {
  const seen = new Set<string>();
  return itens.filter((it) => {
    const key = JSON.stringify({
      tipo: normalizeItemString(it.tipo),
      programa: normalizeItemString(it.programa),
      formato: normalizeItemString(it.formato),
      horario: normalizeItemString(it.horario),
      mes: it.mes ?? null,
      ano: it.ano ?? null,
      insercoes_dia: it.insercoes_dia,
      dias_semana: [...it.dias_semana].map(normalizeItemString).sort(),
      dias_mes: it.dias_mes.map(Number),
      desconto: normalizeItemNumber(it.desconto),
      valor_unit: normalizeItemNumber(it.valor_unit),
      valor_tabela: normalizeItemNumber(it.valor_tabela),
      valor_negociado: normalizeItemNumber(it.valor_negociado),
      total_insercoes: it.total_insercoes,
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const listPis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Buscar roles do usuário
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
    const isProducaoOnly =
      roles.includes("producao") &&
      !roles.includes("admin") &&
      !roles.includes("executivo") &&
      !roles.includes("opec");

    // Verificar se o usuário possui acesso amplo ou se é executivo restrito aos seus próprios PIs
    const { data: userAuth } = await supabase.auth.getUser();
    const isSuper = userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com";
    const hasBroadRole =
      isSuper ||
      roles.some((r: string) =>
        ["admin", "diretoria", "opec", "financeiro", "super_admin"].includes(r),
      );

    let canViewAll = hasBroadRole;
    if (!canViewAll && roles.length > 0) {
      const { data: permRows } = await supabase
        .from("role_permissions")
        .select("permission_key")
        .in("role", roles)
        .eq("permission_key", "pi.view_all");
      canViewAll = (permRows?.length ?? 0) > 0;
    }

    let query = supabase
      .from("pis")
      .select(
        "*, cliente:clientes(id,razao_social,nome_fantasia), agencia:agencias(id,razao_social,nome_fantasia)",
      );

    // Se for perfil produção exclusivo, só vê PIs que têm produção interna agendada
    if (isProducaoOnly) {
      query = query.eq("producao_tipo", "interna");
    } else if (!canViewAll) {
      // Executivo / Usuário restrito: visualiza apenas os PIs atribuídos a ele ou criados por ele
      query = query.or(`executivo_id.eq.${userId},created_by.eq.${userId}`);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pi, error } = await supabase
      .from("pis")
      .select(
        "*, cliente:clientes(*), agencia:agencias(*), emissora:emissoras(*), itens:pi_itens(*), historico:pi_historico(*)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    let atendimento: { nome: string; email: string } | null = null;
    if (pi?.executivo_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome,email")
        .eq("id", pi.executivo_id)
        .maybeSingle();
      if (prof) atendimento = { nome: prof.nome, email: prof.email };
    }

    let criador: {
      nome: string;
      email: string;
      cargo: string | null;
      telefone: string | null;
      whatsapp: string | null;
    } | null = null;
    if (pi?.created_by) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("nome,email,cargo,telefone,whatsapp")
        .eq("id", pi.created_by)
        .maybeSingle();
      if (prof)
        criador = {
          nome: prof.nome,
          email: prof.email,
          cargo: prof.cargo,
          telefone: prof.telefone,
          whatsapp: prof.whatsapp,
        };
    }

    // Enriquece cliente/agência com campos esperados pelo PDF
    // (ie, telefone, email, responsável extraídos do contato principal).
    type Contato = { nome?: string; funcao?: string; email?: string; telefone?: string };
    const enrich = (ent: Record<string, unknown> | null | undefined) => {
      if (!ent) return ent;
      const contatos = (ent.contatos as Contato[] | undefined) ?? [];
      const principal = contatos[0] ?? {};
      const telefone = principal.telefone || contatos.find((c) => c?.telefone)?.telefone || null;
      const email = principal.email || contatos.find((c) => c?.email)?.email || null;
      const responsavel = principal.nome
        ? `${principal.nome}${principal.funcao ? ` (${principal.funcao})` : ""}`
        : null;
      return {
        ...ent,
        ie: (ent.inscricao_estadual as string | null) ?? null,
        im: (ent.inscricao_municipal as string | null) ?? null,
        telefone,
        email,
        responsavel,
      };
    };

    return {
      ...pi,
      cliente: enrich(pi?.cliente as Record<string, unknown> | null),
      agencia: enrich(pi?.agencia as Record<string, unknown> | null),
      atendimento,
      criador,
    };
  });

export const upsertPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PiSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAnyRole(supabase as never, userId, ["admin", "executivo", "opec", "diretoria"]);
    const {
      itens,
      id,
      executivo_id: requestedExec,
      responsavel_negociacao_id,
      executivo_execucao_id,
      ...piData
    } = data;
    const itensSemDuplicidade = dedupePiItens(itens);
    let piId = id;

    // Atualiza cadastro de cliente/agência ANTES de salvar o PI,
    // para que o snapshot/join reflita os dados mais recentes da Receita.
    await refreshPartesPi(
      supabase as unknown as SupabaseLike,
      piData.cliente_id,
      piData.agencia_id,
    );

    // Permite que Admin e Diretoria definam ou reatribuam o executivo responsável
    const { data: privCheck } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "diretoria"]);
    const isPrivileged = (privCheck ?? []).length > 0;

    if (piId) {
      const updatePayload: Record<string, unknown> = {
        ...piData,
        responsavel_negociacao_id,
        executivo_execucao_id,
      };
      // Preserva o executivo original ao editar: só atualiza quando admin ou diretoria
      // selecionar explicitamente um novo executivo (valor truthy).
      if (isPrivileged && requestedExec) {
        updatePayload.executivo_id = requestedExec;
      }
      const { error } = await supabase
        .from("pis")
        .update(updatePayload as never)
        .eq("id", piId);
      if (error) throw new Error(error.message);
      await supabase.from("pi_itens").delete().eq("pi_id", piId);
    } else {
      const execId = isPrivileged && requestedExec ? requestedExec : userId;
      const { data: created, error } = await supabase
        .from("pis")
        // numero é gerado por trigger
        .insert({
          ...piData,
          executivo_id: execId,
          created_by: userId,
          responsavel_negociacao_id,
          executivo_execucao_id,
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      piId = created.id;
    }

    if (itensSemDuplicidade.length > 0) {
      const { error: itErr } = await supabase
        .from("pi_itens")
        .insert(itensSemDuplicidade.map((it) => ({ ...it, pi_id: piId })) as never);
      if (itErr) throw new Error(itErr.message);
    }

    await supabase.from("pi_historico").insert({
      pi_id: piId,
      cliente_id: piData.cliente_id,
      agencia_id: piData.agencia_id,
      acao: id ? "Editado" : "Criado",
      user_id: userId,
      detalhes: { status: piData.status },
    });

    // INTEGRAÇÃO FINANCEIRA AUTOMÁTICA
    // Se o PI tiver valor negociado e uma data de vencimento/faturamento definida, lança no financeiro
    if ((piData.data_vencimento_nota || piData.data_faturamento) && piData.valor_negociado > 0) {
      const dataVenc = piData.data_vencimento_nota || piData.data_faturamento;
      const { data: transExistente } = await supabase
        .from("financeiro_transacoes")
        .select("id")
        .eq("pi_id", piId)
        .eq("tipo", "entrada")
        .maybeSingle();

      if (transExistente) {
        await supabase.from("financeiro_transacoes").update({
          valor: piData.valor_negociado,
          data_vencimento: dataVenc,
          descricao: `Receita PI ${piData.campanha}`,
          cliente_id: piData.cliente_id,
        }).eq("id", transExistente.id);
      } else {
        await supabase.from("financeiro_transacoes").insert({
          tipo: "entrada",
          descricao: `Receita PI ${piData.campanha}`,
          categoria: "Receitas de PIs / Mídia",
          valor: piData.valor_negociado,
          data_competencia: dataVenc,
          data_vencimento: dataVenc,
          status: "pendente",
          cliente_id: piData.cliente_id,
          pi_id: piId,
        } as never);
      }
    }

    // Notifica executivo e produção sobre a necessidade de produção
    try {
      const {
        producao_tipo,
        producao_contato,
        producao_email,
        producao_data,
        producao_material_tipo,
        producao_localizacao,
        producao_observacoes,
      } = piData;

      if (producao_tipo === "interna") {
        const { data: piInfo } = await supabase
          .from("pis")
          .select("numero, campanha, executivo_id")
          .eq("id", piId!)
          .single();

        // 1. Cria registro na tabela de solicitações de produção
        await supabase.from("solicitacoes_producao").insert({
          pi_id: piId,
          solicitado_por: userId,
          contato: producao_contato,
          email: producao_email,
          data_producao: producao_data,
          material_tipo: producao_material_tipo,
          localizacao: producao_localizacao,
          observacoes: producao_observacoes,
        } as never);

        // 2. Notifica o executivo
        if (piInfo?.executivo_id) {
          await supabase.from("notificacoes").insert({
            user_id: piInfo.executivo_id,
            tipo: "producao_solicitada",
            titulo: `Produção agendada — PI ${piInfo.numero}`,
            mensagem: `Produção de ${producao_material_tipo} para a campanha ${piInfo.campanha} foi solicitada.`,
            link: `/pi?id=${piId}`,
            metadata: { ref_id: piId, evento: "producao_interna" },
          } as never);
        }

        // 3. Notifica a equipe de produção
        const { data: prodUsers } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "producao" as never);

        const prodNotifs = (prodUsers ?? [])
          .map((u: any) => u.user_id as string)
          .filter(Boolean)
          .map((uid) => ({
            user_id: uid,
            tipo: "producao_solicitada",
            titulo: `Nova Produção — PI ${piInfo?.numero ?? ""}`,
            mensagem: `Cliente: ${producao_contato} | Tipo: ${producao_material_tipo} | Local: ${producao_localizacao}`,
            link: `/pi?id=${piId}`,
            metadata: { ref_id: piId, evento: "producao_solicitada" },
          }));

        if (prodNotifs.length > 0) {
          await supabase.from("notificacoes").insert(prodNotifs as never);
        }
      }
    } catch (e) {
      console.error("Falha ao processar produção:", e);
    }

    // Notifica social media se PI contém entregas de Instagram (feed/stories/reels)
    try {
      const { SOCIAL_MEDIA_EMAILS, isSocialItem, labelSocialItem, datasPublicacaoSocial } =
        await import("@/lib/social-media-notify");
      const socialItens = itensSemDuplicidade.filter(isSocialItem);
      if (socialItens.length > 0 && SOCIAL_MEDIA_EMAILS.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,email")
          .in("email", SOCIAL_MEDIA_EMAILS as never);
        const { data: piInfo2 } = await supabase
          .from("pis")
          .select("numero, campanha, periodo_inicio, cliente:clientes(razao_social,nome_fantasia)")
          .eq("id", piId!)
          .single();
        const cliente =
          (piInfo2 as any)?.cliente?.razao_social ?? (piInfo2 as any)?.cliente?.nome_fantasia ?? "";
        const entregas = socialItens.map(labelSocialItem).join(" | ");
        const datas = datasPublicacaoSocial(socialItens as never, piInfo2?.periodo_inicio as never);
        const datasTxt = datas.length
          ? datas.map((d) => d.split("-").reverse().join("/")).join(", ")
          : "";
        for (const p of profs ?? []) {
          await supabase.from("notificacoes").insert({
            user_id: (p as any).id,
            tipo: "outro",
            titulo: `Nova entrega Social Media — PI ${piInfo2?.numero ?? ""}`,
            mensagem: `Cliente: ${cliente}. Entregas: ${entregas}.${datasTxt ? ` Datas: ${datasTxt}.` : ""}`,
            link: `/pi?id=${piId}`,
            metadata: { ref_id: piId, evento: "pi_social_criado" },
          } as never);
        }
      }
    } catch (e) {
      console.error("Falha ao notificar social media:", e);
    }

    return { id: piId };
  });

const SubstituirSchema = PiSchema.extend({ original_id: z.string().uuid() });

export const substituirPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubstituirSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { original_id, itens, id: _ignored, observacao, ...piData } = data;
    const itensSemDuplicidade = dedupePiItens(itens);

    // Refresh dos cadastros antes de criar o CS
    await refreshPartesPi(
      supabase as unknown as SupabaseLike,
      piData.cliente_id,
      piData.agencia_id,
    );

    const { data: original, error: oErr } = await supabase
      .from("pis")
      .select("numero, status")
      .eq("id", original_id)
      .single();
    if (oErr) throw new Error(oErr.message);

    const { error: updErr } = await supabase
      .from("pis")
      .update({ status: "substituido" } as never)
      .eq("id", original_id);
    if (updErr) throw new Error(updErr.message);

    // Observação do CS contém apenas a referência ao PI imediatamente anterior.
    const novaObs = `CS do PI ${original.numero}`;
    const { data: created, error } = await supabase
      .from("pis")
      .insert({
        ...piData,
        observacao: novaObs,
        substitui_pi_id: original_id,
        executivo_id: userId,
        created_by: userId,
      } as never)
      .select("id, numero")
      .single();
    if (error) throw new Error(error.message);

    if (itensSemDuplicidade.length > 0) {
      const { error: itErr } = await supabase
        .from("pi_itens")
        .insert(itensSemDuplicidade.map((it) => ({ ...it, pi_id: created.id })) as never);
      if (itErr) throw new Error(itErr.message);
    }

    await supabase.from("pi_historico").insert([
      {
        pi_id: original_id,
        cliente_id: piData.cliente_id,
        agencia_id: piData.agencia_id,
        acao: "Substituído por CS",
        user_id: userId,
        detalhes: { novo_pi: created.numero },
      },
      {
        pi_id: created.id,
        cliente_id: piData.cliente_id,
        agencia_id: piData.agencia_id,
        acao: "Criado como CS",
        user_id: userId,
        detalhes: { substitui: original.numero },
      },
    ] as never);

    return { id: created.id, numero: created.numero, original_numero: original.numero };
  });

export const cancelarPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        motivo: z.string().min(1).max(500),
        substituir: z.boolean(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Lê IDs do PI para rodar refresh do cadastro antes de qualquer alteração
    const { data: piRef } = await supabase
      .from("pis")
      .select("cliente_id, agencia_id")
      .eq("id", data.id)
      .maybeSingle();
    await refreshPartesPi(
      supabase as unknown as SupabaseLike,
      (piRef?.cliente_id as string | null) ?? null,
      (piRef?.agencia_id as string | null) ?? null,
    );

    const novoStatus = data.substituir ? "substituido" : "cancelado";
    const { data: pi, error } = await supabase
      .from("pis")
      .update({ status: novoStatus, motivo_cancelamento: data.motivo } as never)
      .eq("id", data.id)
      .select("*, itens:pi_itens(*)")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("pi_historico").insert({
      pi_id: pi.id,
      cliente_id: pi.cliente_id,
      agencia_id: pi.agencia_id,
      acao: data.substituir ? "Substituído" : "Cancelado",
      user_id: userId,
      detalhes: { motivo: data.motivo },
    });

    if (data.substituir) {
      const { data: novo, error: nErr } = await supabase
        .from("pis")
        .insert({
          cliente_id: pi.cliente_id,
          agencia_id: pi.agencia_id,
          campanha: pi.campanha,
          mes_veiculacao: pi.mes_veiculacao,
          ano_veiculacao: pi.ano_veiculacao,
          periodo_inicio: pi.periodo_inicio,
          periodo_fim: pi.periodo_fim,
          observacao: pi.numero,
          responsavel_negociacao_id: pi.responsavel_negociacao_id,
          executivo_execucao_id: pi.executivo_execucao_id,
          status: "rascunho",
          substitui_pi_id: pi.id,
          valor_tabela: pi.valor_tabela,
          valor_desconto: pi.valor_desconto,
          valor_negociado: pi.valor_negociado,
          total_insercoes: pi.total_insercoes,
          executivo_id: userId,
          created_by: userId,
        } as never)
        .select("id")
        .single();
      if (nErr) throw new Error(nErr.message);

      const itens = (pi.itens ?? []) as Array<Record<string, unknown>>;
      if (itens.length > 0) {
        await supabase.from("pi_itens").insert(
          itens.map((it) => {
            const {
              id: _id,
              pi_id: _piId,
              created_at: _ca,
              ...rest
            } = it as {
              id?: string;
              pi_id?: string;
              created_at?: string;
            } & Record<string, unknown>;
            return { ...rest, pi_id: novo.id } as never;
          }) as never,
        );
      }
      return { novoId: novo.id };
    }
    return { novoId: null };
  });

export const listHistoricoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ cliente_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("pi_historico")
      .select("*, pi:pis(numero,campanha,status,valor_negociado)")
      .eq("cliente_id", data.cliente_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Envia PI para aprovação da Diretoria. */
export const enviarPiParaAprovacao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const request = getRequest();
    const { data: pi, error } = await supabase
      .from("pis")
      .update({
        status: "aguardando_aprovacao",
        enviado_aprovacao_em: new Date().toISOString(),
        motivo_reprovacao: null,
      } as never)

      .eq("id", data.id)
      .select(
        "id, numero, campanha, executivo_id, cliente_id, agencia_id, cliente:clientes(razao_social), agencia:agencias(razao_social)",
      )
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("pi_historico").insert({
      pi_id: pi.id,
      cliente_id: pi.cliente_id,
      agencia_id: pi.agencia_id,
      acao: "Enviado para aprovação",
      user_id: userId,
      detalhes: {},
    });

    // Notifica diretoria (admins) in-app e email
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id, profiles(nome, email)")
      .eq("role", "admin");
    const { data: executivo } = pi.executivo_id
      ? await supabase.from("profiles").select("nome").eq("id", pi.executivo_id).maybeSingle()
      : { data: null };

    const rows = (admins ?? [])
      .map((a) => a.user_id as string)
      .filter(Boolean)
      .map((uid) => ({
        user_id: uid,
        tipo: "pi_aguardando_aprovacao" as never,
        titulo: `PI ${pi.numero} aguardando aprovação`,
        mensagem: `${pi.campanha} — aprovação da Diretoria pendente`,
        link: `/pi?id=${pi.id}`,
        metadata: { ref_id: pi.id } as never,
      }));
    if (rows.length > 0) await supabase.from("notificacoes").insert(rows as never);

    // Envio de email para diretoria
    for (const admin of admins ?? []) {
      const email = (admin.profiles as any)?.email;
      if (email && request) {
        await fetch(`${new URL(request.url).origin}/lovable/email/transactional/send`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(context as any).token}`,
          },
          body: JSON.stringify({
            templateName: "pi-pendente-aprovacao",
            recipientEmail: email,
            templateData: {
              numeroPi: pi.numero,
              campanha: pi.campanha,
              cliente:
                (pi.cliente as any)?.razao_social || (pi.agencia as any)?.razao_social || "N/A",
              executivo: (executivo as any)?.nome || "Não informado",
              linkPi: `${new URL(request.url).origin}/pi?id=${pi.id}`,
            },
          }),
        }).catch((err) => console.error("Erro ao enviar email para admin:", err));
      }
    }

    return { ok: true };
  });

/** Diretoria aprova o PI. */
export const aprovarPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const request = getRequest();
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Apenas a Diretoria pode aprovar PIs");

    const { data: pi, error } = await supabase
      .from("pis")
      .update({
        status: "aprovado",
        aprovado_por: userId,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: null,
      } as never)
      .eq("id", data.id)
      .select(
        "id, numero, campanha, executivo_id, cliente_id, agencia_id, cliente:clientes(razao_social), agencia:agencias(razao_social)",
      )
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("pi_historico").insert({
      pi_id: pi.id,
      cliente_id: pi.cliente_id,
      agencia_id: pi.agencia_id,
      acao: "Aprovado pela Diretoria",
      user_id: userId,
      detalhes: {},
    });

    if (pi.executivo_id) {
      await supabase.from("notificacoes").insert({
        user_id: pi.executivo_id,
        tipo: "pi_aprovado" as never,
        titulo: `PI ${pi.numero} aprovado pela Diretoria`,
        mensagem: `${pi.campanha} foi aprovado pela Diretoria. Agora você pode enviar o link de assinatura para o cliente.`,
        link: `/pi?id=${pi.id}`,
        metadata: { ref_id: pi.id } as never,
      } as never);
    }

    // TODO: envio automático para OPEC (opectv@tvbrasilia.com.br) será habilitado
    // assim que o domínio de e-mail estiver configurado.

    return { ok: true };
  });

/** Diretoria reprova o PI. */
export const reprovarPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), motivo: z.string().min(1).max(500) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Apenas a Diretoria pode reprovar PIs");

    const { data: pi, error } = await supabase
      .from("pis")
      .update({
        status: "reprovado",
        aprovado_por: userId,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: data.motivo,
      } as never)
      .eq("id", data.id)
      .select("id, numero, campanha, executivo_id, cliente_id, agencia_id")
      .single();
    if (error) throw new Error(error.message);

    await supabase.from("pi_historico").insert({
      pi_id: pi.id,
      cliente_id: pi.cliente_id,
      agencia_id: pi.agencia_id,
      acao: "Reprovado pela Diretoria",
      user_id: userId,
      detalhes: { motivo: data.motivo },
    });

    if (pi.executivo_id) {
      await supabase.from("notificacoes").insert({
        user_id: pi.executivo_id,
        tipo: "pi_reprovado" as never,
        titulo: `PI ${pi.numero} reprovado`,
        mensagem: `Motivo: ${data.motivo}`,
        link: `/pi?id=${pi.id}`,
        metadata: { ref_id: pi.id } as never,
      } as never);
    }

    return { ok: true };
  });

/** Carrega um PI completo a partir do número (para histórico/comparação). */
export const getPiPorNumero = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ numero: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: pi, error } = await supabase
      .from("pis")
      .select(
        "*, cliente:clientes(razao_social,nome_fantasia), agencia:agencias(razao_social,nome_fantasia), itens:pi_itens(*)",
      )
      .eq("numero", data.numero)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!pi) throw new Error(`PI ${data.numero} não encontrado`);
    return pi;
  });

/** Compara dois PIs (por número) e devolve a lista de diferenças relevantes. */
export const compararPis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ numeroA: z.string().min(1).max(50), numeroB: z.string().min(1).max(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const sel = "*, itens:pi_itens(*)";
    const [{ data: a, error: ea }, { data: b, error: eb }] = await Promise.all([
      supabase.from("pis").select(sel).eq("numero", data.numeroA).maybeSingle(),
      supabase.from("pis").select(sel).eq("numero", data.numeroB).maybeSingle(),
    ]);
    if (ea) throw new Error(ea.message);
    if (eb) throw new Error(eb.message);
    if (!a || !b) throw new Error("PI não encontrado para comparação");

    type Pi = Record<string, unknown> & {
      itens?: Array<Record<string, unknown>>;
      campanha?: string;
      mes_veiculacao?: number;
      ano_veiculacao?: number;
      valor_negociado?: number;
      valor_tabela?: number;
      valor_desconto?: number;
      total_insercoes?: number;
      faturamento_contra?: string;
      faturamento_tipo?: string;
      data_faturamento?: string | null;
      data_envio_nota?: string | null;
      data_vencimento_nota?: string | null;
      observacao?: string | null;
      status?: string;
    };
    const A = a as Pi;
    const B = b as Pi;
    const campos: Array<{ key: keyof Pi; label: string }> = [
      { key: "campanha", label: "Campanha" },
      { key: "mes_veiculacao", label: "Mês veiculação" },
      { key: "ano_veiculacao", label: "Ano veiculação" },
      { key: "valor_negociado", label: "Valor negociado" },
      { key: "valor_tabela", label: "Valor tabela" },
      { key: "valor_desconto", label: "Desconto" },
      { key: "total_insercoes", label: "Total inserções" },
      { key: "faturamento_contra", label: "Faturar contra" },
      { key: "faturamento_tipo", label: "Tipo faturamento" },
      { key: "data_faturamento", label: "Data faturamento" },
      { key: "data_envio_nota", label: "Envio nota" },
      { key: "data_vencimento_nota", label: "Vencimento nota" },
      { key: "observacao", label: "Observação" },
      { key: "status", label: "Status" },
    ];
    const diffs = campos
      .filter((c) => (A[c.key] ?? null) !== (B[c.key] ?? null))
      .map((c) => ({ campo: c.label, de: A[c.key] ?? null, para: B[c.key] ?? null }));

    const ia = (A.itens ?? []).length;
    const ib = (B.itens ?? []).length;
    if (ia !== ib) diffs.push({ campo: "Qtd. de itens", de: ia, para: ib });

    return {
      a: { numero: A.numero as string, status: A.status as string },
      b: { numero: B.numero as string, status: B.status as string },
      diffs,
    };
  });

/** Admin exclui um PI permanentemente (com cascata em itens, histórico e anexos). */
export const deletarPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!isAdmin) throw new Error("Apenas administradores podem excluir PIs");

    const { error: errItens } = await supabase.from("pi_itens").delete().eq("pi_id", data.id);
    if (errItens) throw new Error(errItens.message);

    const { error: errHist } = await supabase.from("pi_historico").delete().eq("pi_id", data.id);
    if (errHist) throw new Error(errHist.message);

    const { error: errAnexos } = await supabase.from("pi_anexos").delete().eq("pi_id", data.id);
    if (errAnexos) throw new Error(errAnexos.message);

    const { error } = await supabase.from("pis").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
