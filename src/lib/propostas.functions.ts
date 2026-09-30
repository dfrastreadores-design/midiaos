import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ItemSchema = z.object({
  tipo: z.string().max(100),
  programa: z.string().max(200).nullable().optional(),
  horario: z.string().max(100).nullable().optional(),
  formato: z.string().max(50).nullable().optional(),
  mes: z.number().int().min(1).max(12).nullable().optional(),
  ano: z.number().int().min(2020).max(2100).nullable().optional(),
  insercoes_dia: z.number().int().nonnegative(),
  dias_semana: z.array(z.string()),
  dias_mes: z.array(z.number().int()),
  desconto: z.number(),
  valor_unit: z.number(),
  valor_tabela: z.number(),
  valor_negociado: z.number(),
  total_insercoes: z.number().int(),
  dias_veiculacao: z.number().int().nonnegative().nullable().optional(),
  link_modelo: z
    .string()
    .trim()
    .max(500)
    .nullable()
    .optional()
    .transform((v) => (v && v.length ? v : null)),
});

const PropostaSchema = z.object({
  id: z.string().uuid().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  agencia_id: z.string().uuid().nullable().optional(),
  executivo_id: z.string().uuid().nullable().optional(),
  executivo_parceiro_id: z.string().uuid().nullable().optional(),
  cliente_avulso: z.string().trim().max(200).nullable().optional(),
  campanha: z.string().min(1).max(200),
  validade: z.string().nullable().optional(),
  observacao: z.string().max(2000).nullable().optional(),
  status: z.enum(["rascunho", "enviada", "aprovada", "recusada", "convertida", "finalizada"]),
  valor_tabela: z.number(),
  valor_desconto: z.number(),
  valor_negociado: z.number(),
  total_insercoes: z.number().int(),
  comissao_pct: z.number().default(0),
  itens: z.array(ItemSchema),
  briefing_id: z.string().uuid().nullable().optional(),
});

export const listPropostas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roles = (roleRows ?? []).map((r: { role: string }) => r.role);

    const { data: userAuth } = await supabase.auth.getUser();
    const isSuper = userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com";
    const hasBroadRole =
      isSuper || roles.some((r: string) => ["admin", "diretoria", "super_admin"].includes(r));

    let query = supabase.from("propostas").select("*");
    if (!hasBroadRole) {
      // Executivo / Parceiro: restringe às propostas de sua autoria, atribuição ou parceria
      query = query.or(
        `executivo_id.eq.${userId},created_by.eq.${userId},executivo_parceiro_id.eq.${userId}`,
      );
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as Array<Record<string, unknown>>;

    const userIds = Array.from(
      new Set(
        rows
          .flatMap((r) => [r.executivo_id, r.created_by])
          .filter((v): v is string => typeof v === "string" && v.length > 0),
      ),
    );
    const clienteIds = Array.from(
      new Set(rows.map((r) => r.cliente_id).filter((v): v is string => typeof v === "string")),
    );
    const agenciaIds = Array.from(
      new Set(rows.map((r) => r.agencia_id).filter((v): v is string => typeof v === "string")),
    );

    const [profsRes, clientesRes, agenciasRes] = await Promise.all([
      userIds.length
        ? context.supabase.from("profiles").select("id,nome,email").in("id", userIds)
        : Promise.resolve({ data: [] as Array<{ id: string; nome: string; email: string }> }),
      clienteIds.length
        ? context.supabase
            .from("clientes")
            .select("id,razao_social,nome_fantasia")
            .in("id", clienteIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; razao_social: string; nome_fantasia: string | null }>,
          }),
      agenciaIds.length
        ? context.supabase
            .from("agencias")
            .select("id,razao_social,nome_fantasia")
            .in("id", agenciaIds)
        : Promise.resolve({
            data: [] as Array<{ id: string; razao_social: string; nome_fantasia: string | null }>,
          }),
    ]);

    const profilesMap = new Map(
      (profsRes.data ?? []).map((p) => [
        p.id as string,
        { nome: p.nome as string, email: p.email as string },
      ]),
    );
    const clientesMap = new Map((clientesRes.data ?? []).map((c) => [c.id as string, c]));
    const agenciasMap = new Map((agenciasRes.data ?? []).map((a) => [a.id as string, a]));

    return rows.map((r) => {
      const uid = (r.executivo_id ?? r.created_by) as string | null;
      const prof = uid ? profilesMap.get(uid) : undefined;
      return {
        ...r,
        criado_por: prof?.nome ?? prof?.email ?? null,
        cliente: r.cliente_id ? (clientesMap.get(r.cliente_id as string) ?? null) : null,
        agencia: r.agencia_id ? (agenciasMap.get(r.agencia_id as string) ?? null) : null,
      };
    });
  });

export const getProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: prop, error } = await context.supabase
      .from("propostas")
      .select(
        "*, tenant_id, itens:proposta_itens(*), cliente:clientes!propostas_cliente_id_fkey(id,razao_social,nome_fantasia,cnpj,logo_url), agencia:agencias!propostas_agencia_id_fkey(id,razao_social,nome_fantasia,cnpj,logo_url), executivo:profiles!propostas_executivo_id_fkey(id,nome,email,telefone,cargo)",
      )
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);

    // Enriquecer itens com dados de produtos (endereço, latitude, longitude, fotos) caso não estejam preenchidos no item
    if (prop?.itens && Array.isArray(prop.itens) && prop.itens.length > 0) {
      try {
        const { data: prods } = await (context.supabase.from("produtos") as any).select(
          "id, nome, programa, tipo, endereco_ponto, latitude, longitude, fotos",
        );
        if (prods && prods.length > 0) {
          const prodsMap = new Map<string, any>();
          const prodsByNome = new Map<string, any>();
          for (const prod of prods) {
            prodsMap.set(prod.id, prod);
            if (prod.nome) prodsByNome.set(prod.nome.trim().toLowerCase(), prod);
            if (prod.programa) prodsByNome.set(prod.programa.trim().toLowerCase(), prod);
          }

          prop.itens = prop.itens.map((it: any) => {
            const matched =
              (it.produto_id ? prodsMap.get(it.produto_id) : null) ||
              (it.programa ? prodsByNome.get(it.programa.trim().toLowerCase()) : null) ||
              (it.tipo ? prodsByNome.get(it.tipo.trim().toLowerCase()) : null);

            let fotos = Array.isArray(it.fotos) && it.fotos.length > 0 ? it.fotos : [];
            if (fotos.length === 0 && matched?.fotos) {
              if (Array.isArray(matched.fotos)) fotos = matched.fotos;
              else if (typeof matched.fotos === "string") {
                try {
                  fotos = JSON.parse(matched.fotos);
                } catch {
                  /* ignore */
                }
              }
            }

            return {
              ...it,
              endereco_ponto: it.endereco_ponto || matched?.endereco_ponto || null,
              latitude: it.latitude ?? matched?.latitude ?? null,
              longitude: it.longitude ?? matched?.longitude ?? null,
              fotos,
            };
          });
        }
      } catch (err) {
        console.warn("Aviso ao enriquecer itens da proposta com produtos:", err);
      }
    }

    return prop as any;
  });

export const salvarPropostaLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        logo_data_url: z.string().max(3_000_000).nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("propostas")
      .update({ logo_data_url: data.logo_data_url } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const vincularPropostaAoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ proposta_id: z.string().uuid(), pi_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prop } = await supabase
      .from("propostas")
      .select("numero, cliente_id, agencia_id")
      .eq("id", data.proposta_id)
      .single();
    const { error } = await supabase
      .from("propostas")
      .update({ status: "convertida", pi_id: data.pi_id } as never)
      .eq("id", data.proposta_id);
    if (error) throw new Error(error.message);
    await supabase.from("pi_historico").insert({
      pi_id: data.pi_id,
      cliente_id: prop?.cliente_id ?? null,
      agencia_id: prop?.agencia_id ?? null,
      acao: "Vinculado à proposta",
      user_id: userId,
      detalhes: { proposta_numero: prop?.numero },
    });
    return { ok: true };
  });

export const upsertProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => PropostaSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { assertAnyRole } = await import("@/lib/roles.server");
    await assertAnyRole(supabase as never, userId, ["admin", "executivo", "diretoria"]);
    const { itens, id, ...rest } = data;
    let propId = id;
    if (propId) {
      const { error } = await supabase
        .from("propostas")
        .update(rest as never)
        .eq("id", propId);
      if (error) throw new Error(error.message);
      await supabase.from("proposta_itens").delete().eq("proposta_id", propId);
    } else {
      const { data: created, error } = await supabase
        .from("propostas")
        .insert({ ...rest, executivo_id: rest.executivo_id || userId, created_by: userId } as never)
        .select("id, numero, briefing_id")
        .single();
      if (error) throw new Error(error.message);
      propId = created.id;

      // Se houver um briefing_id, vincula de volta e notifica o parceiro
      if (rest.briefing_id) {
        const { data: briefing } = await supabase
          .from("briefings")
          .select("created_by, razao_social, campanha")
          .eq("id", rest.briefing_id)
          .single();

        if (briefing) {
          // Atualiza o briefing com o ID da proposta e muda status para concluído
          await supabase
            .from("briefings")
            .update({ proposta_id: propId, status: "concluido" } as never)
            .eq("id", rest.briefing_id);

          // Notifica o parceiro (quem criou o briefing)
          await supabase.from("notificacoes").insert({
            user_id: briefing.created_by,
            tipo: "outro",
            titulo: "Proposta Pronta!",
            mensagem: `A proposta para ${briefing.razao_social} - ${briefing.campanha} (Nº ${created.numero}) já está disponível.`,
            link: `/briefings?id=${rest.briefing_id}`,
            metadata: { briefing_id: rest.briefing_id, proposta_id: propId },
          } as never);
        }
      }
    }
    if (itens.length > 0) {
      const { error: itErr } = await supabase
        .from("proposta_itens")
        .insert(itens.map((it) => ({ ...it, proposta_id: propId })) as never);
      if (itErr) throw new Error(itErr.message);
    }
    return { id: propId };
  });

export const deleteProposta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("propostas").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const converterPropostaEmPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        proposta_id: z.string().uuid(),
        mes_veiculacao: z.number().int().min(1).max(12),
        ano_veiculacao: z.number().int().min(2020).max(2100),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prop, error: pErr } = await supabase
      .from("propostas")
      .select("*, itens:proposta_itens(*)")
      .eq("id", data.proposta_id)
      .single();
    if (pErr) throw new Error(pErr.message);

    // Calcula período de veiculação a partir dos dias_mes dos itens
    const itensRaw = (prop.itens ?? []) as Array<Record<string, unknown>>;
    const todosDias = new Set<number>();
    for (const it of itensRaw) {
      const dias = (it.dias_mes as number[] | undefined) ?? [];
      dias.forEach((d) => todosDias.add(d));
    }
    const ordenados = Array.from(todosDias).sort((a, b) => a - b);
    const fmtDia = (d: number) =>
      `${data.ano_veiculacao}-${String(data.mes_veiculacao).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const periodo_inicio = ordenados.length > 0 ? fmtDia(ordenados[0]) : null;
    const periodo_fim = ordenados.length > 0 ? fmtDia(ordenados[ordenados.length - 1]) : null;

    // Faturamento: com agência, sempre líquido (−20%); sem agência, bruto.
    const temAgencia = !!prop.agencia_id;
    const valorBruto = Number(prop.valor_negociado || 0);
    const valorFinal = temAgencia ? +(valorBruto * 0.8).toFixed(2) : valorBruto;

    const { data: pi, error: piErr } = await supabase
      .from("pis")
      .insert({
        cliente_id: prop.cliente_id,
        agencia_id: prop.agencia_id,
        campanha: prop.campanha,
        mes_veiculacao: data.mes_veiculacao,
        ano_veiculacao: data.ano_veiculacao,
        periodo_inicio,
        periodo_fim,
        observacao: `Convertido da proposta ${prop.numero}. ${prop.observacao ?? ""}`,
        status: "rascunho",
        valor_tabela: prop.valor_tabela,
        valor_desconto: prop.valor_desconto,
        valor_negociado: valorFinal,
        total_insercoes: prop.total_insercoes,
        faturamento_contra: temAgencia ? "agencia" : "cliente",
        faturamento_tipo: temAgencia ? "liquido" : "bruto",
        executivo_id: prop.executivo_id ?? userId,
        created_by: userId,
      } as never)
      .select("id")
      .single();
    if (piErr) throw new Error(piErr.message);

    if (itensRaw.length > 0) {
      await supabase.from("pi_itens").insert(
        itensRaw.map((it) => {
          const {
            id: _i,
            proposta_id: _p,
            created_at: _c,
            ...rest
          } = it as Record<string, unknown> & {
            id?: string;
            proposta_id?: string;
            created_at?: string;
          };
          return { ...rest, pi_id: pi.id } as never;
        }) as never,
      );
    }

    // Atualiza cadastros de cliente/agência via CNPJ (silencioso)
    try {
      const { refreshPartesPi } = await import("@/lib/pi.functions");
      await (
        refreshPartesPi as unknown as (
          s: unknown,
          c: string | null,
          a: string | null,
        ) => Promise<void>
      )(supabase, prop.cliente_id ?? null, prop.agencia_id ?? null);
    } catch (e) {
      console.warn("[converterPropostaEmPi] refresh CNPJ falhou:", (e as Error).message);
    }

    await supabase
      .from("propostas")
      .update({ status: "convertida", pi_id: pi.id } as never)
      .eq("id", data.proposta_id);

    await supabase.from("pi_historico").insert({
      pi_id: pi.id,
      cliente_id: prop.cliente_id,
      agencia_id: prop.agencia_id,
      acao: "Criado a partir de proposta",
      user_id: userId,
      detalhes: { proposta_numero: prop.numero },
    });

    return { pi_id: pi.id };
  });

export const cobrarRetornoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Buscar detalhes da proposta e do briefing vinculado
    const { data: prop, error: pErr } = await supabase
      .from("propostas")
      .select("numero, campanha, briefing_id, briefing:briefings(created_by, razao_social)")
      .eq("id", data.id)
      .single();

    if (pErr) throw new Error(pErr.message);

    const briefing = prop.briefing as any;
    if (!briefing?.created_by)
      throw new Error("Parceiro comercial não identificado para esta proposta.");

    // Buscar quem está cobrando (ADM)
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome")
      .eq("id", userId)
      .single();

    const solicitante = profile?.nome || "Administração";

    // Notificar o Parceiro Comercial (quem criou o briefing)
    await supabaseAdmin.from("notificacoes").insert({
      user_id: briefing.created_by,
      tipo: "outro",
      titulo: "Cobrança de Retorno (ADM)",
      mensagem: `${solicitante} está solicitando o status do retorno da proposta Nº ${prop.numero} para o cliente: ${briefing.razao_social}.`,
      link: `/briefings?id=${prop.briefing_id}`,
      metadata: {
        proposta_id: data.id,
        briefing_id: prop.briefing_id,
        tipo_evento: "cobranca_retorno_adm",
      },
    });

    return { ok: true };
  });

export const listProposalHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ proposal_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: history, error } = await supabase
      .from("proposal_history")
      .select("*")
      .eq("proposal_id", data.proposal_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    const rows = (history ?? []) as any[];
    const userIds = Array.from(new Set(rows.map((r) => r.modified_by).filter(Boolean)));
    const profilesMap = new Map<string, { nome: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", userIds);
      (profs ?? []).forEach((p: any) => profilesMap.set(p.id, { nome: p.nome, email: p.email }));
    }
    return rows.map((r) => ({ ...r, profiles: profilesMap.get(r.modified_by) ?? null }));
  });

export const gerarPropostaDoPi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pi_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: pi, error: piErr } = await supabase
      .from("pis")
      .select("*, itens:pi_itens(*)")
      .eq("id", data.pi_id)
      .single();
    if (piErr) throw new Error(piErr.message);

    const itensRaw = ((pi as any).itens ?? []) as Array<Record<string, unknown>>;

    const { data: created, error } = await supabase
      .from("propostas")
      .insert({
        cliente_id: (pi as any).cliente_id,
        agencia_id: (pi as any).agencia_id,
        campanha: `${(pi as any).campanha} (Renovação)`,
        observacao: `Gerada a partir do PI ${(pi as any).numero}.`,
        status: "rascunho",
        valor_tabela: (pi as any).valor_tabela ?? 0,
        valor_desconto: (pi as any).valor_desconto ?? 0,
        valor_negociado: (pi as any).valor_negociado ?? 0,
        total_insercoes: (pi as any).total_insercoes ?? 0,
        executivo_id: (pi as any).executivo_id ?? userId,
        created_by: userId,
      } as never)
      .select("id, numero")
      .single();
    if (error) throw new Error(error.message);

    if (itensRaw.length > 0) {
      const { error: itErr } = await supabase.from("proposta_itens").insert(
        itensRaw.map((it) => {
          const {
            id: _i,
            pi_id: _p,
            created_at: _c,
            dias_mes: _d,
            dias_semana: _ds,
            mes: _m,
            ano: _a,
            horario: _h,
            insercoes_dia: _id,
            ...rest
          } = it as Record<string, unknown> & {
            id?: string;
            pi_id?: string;
            created_at?: string;
            dias_mes?: unknown;
            dias_semana?: unknown;
            mes?: unknown;
            ano?: unknown;
            horario?: unknown;
            insercoes_dia?: unknown;
          };
          return { ...rest, proposta_id: created.id } as never;
        }) as never,
      );
      if (itErr) throw new Error(itErr.message);
    }

    return { id: created.id, numero: created.numero };
  });

export const marcarPropostaRecusada = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        motivo: z.string().trim().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: prop } = await supabase
      .from("propostas")
      .select("observacao, numero")
      .eq("id", data.id)
      .single();
    const carimbo = `[Não interessado em ${new Date().toLocaleDateString("pt-BR")}]${data.motivo ? ` ${data.motivo}` : ""}`;
    const novaObs = [prop?.observacao, carimbo].filter(Boolean).join("\n");
    const { error } = await supabase
      .from("propostas")
      .update({ status: "recusada", observacao: novaObs } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    try {
      await supabase.from("proposal_history").insert({
        proposal_id: data.id,
        modified_by: userId,
        change_type: "status",
        details: { status: "recusada", motivo: data.motivo ?? null },
      } as never);
    } catch {}
    return { ok: true };
  });
