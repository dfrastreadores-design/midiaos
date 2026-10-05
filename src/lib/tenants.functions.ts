import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { isMasterEmail } from "@/lib/master-user";

async function assertSuperAdmin(ctx: { supabase: any; userId: string }) {
  const { data: userAuth } = await ctx.supabase.auth.getUser();
  if (isMasterEmail(userAuth?.user?.email)) {
    return;
  }
  const { data, error } = await ctx.supabase.rpc("is_super_admin", { _user_id: ctx.userId });
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error("Acesso restrito ao proprietário da plataforma");
}

export type TenantInput = {
  id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  contato_nome?: string;
  contato_email?: string;
  contato_whatsapp?: string;
  plano: string;
  ciclo: string;
  valor_mensal: number;
  status: string;
  data_inicio?: string;
  proximo_vencimento?: string;
  observacoes?: string;
  max_usuarios?: number;
  logo_url?: string | null;
  categorias_servicos?: string[];
  proposta_layout_padrao?: string;
  plano_id?: string | null;
  modulos_override?: string[] | null;
  max_usuarios_override?: number | null;
  modelos_proposta?: any[];
};

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    // contagem de usuários por tenant
    const ids = rows.map((r) => r.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("tenant_id")
        .in("tenant_id", ids);
      for (const p of (profs ?? []) as Array<{ tenant_id: string | null }>) {
        if (!p.tenant_id) continue;
        counts[p.tenant_id] = (counts[p.tenant_id] ?? 0) + 1;
      }
    }
    return rows.map((r) => ({ ...r, usuarios_count: counts[r.id] ?? 0 }));
  });

export const getTenantsStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("tenants")
      .select("status, plano, valor_mensal, proximo_vencimento, bloqueado");
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const ativos = rows.filter((r) => r.status === "ativo" && !r.bloqueado).length;
    const trials = rows.filter((r) => r.status === "trial" || r.plano === "demo").length;
    const inadimplentes = rows.filter((r) => r.status === "inadimplente" || r.bloqueado).length;
    const mrr = rows
      .filter((r) => r.status === "ativo" && !r.bloqueado)
      .reduce((s, r) => s + Number(r.valor_mensal || 0), 0);
    return { total: rows.length, ativos, trials, inadimplentes, mrr };
  });

/** Visão completa da plataforma: uso agregado, top clientes, vencimentos, atividade recente */
export const getOwnerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const sb = context.supabase;
    const hoje = new Date();
    const ini30 = new Date(hoje.getTime() - 30 * 86400000).toISOString();
    const ini7 = new Date(hoje.getTime() - 7 * 86400000).toISOString();
    const fim30 = new Date(hoje.getTime() + 30 * 86400000).toISOString().slice(0, 10);

    const [tenants, profiles, pis, propostas, clientes, agencias, vencendo, ativos7d, novos30d] =
      await Promise.all([
        sb
          .from("tenants")
          .select("id, razao_social, nome_fantasia, status, plano, valor_mensal, bloqueado"),
        sb.from("profiles").select("id, tenant_id, last_active_at, created_at"),
        sb.from("pis").select("id, tenant_id, valor_negociado, status, created_at"),
        sb.from("propostas").select("id, tenant_id, valor_total, status, created_at"),
        sb.from("clientes").select("id, tenant_id"),
        sb.from("agencias").select("id, tenant_id"),
        sb
          .from("tenants")
          .select("id, razao_social, proximo_vencimento, valor_mensal, status")
          .not("proximo_vencimento", "is", null)
          .lte("proximo_vencimento", fim30)
          .order("proximo_vencimento", { ascending: true })
          .limit(10),
        sb.from("profiles").select("id, tenant_id").gte("last_active_at", ini7),
        sb
          .from("profiles")
          .select("id, nome, email, tenant_id, created_at")
          .gte("created_at", ini30)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

    const tenantsArr = (tenants.data ?? []) as any[];
    const tMap = new Map(tenantsArr.map((t) => [t.id, t]));

    const totalsByTenant = new Map<string, any>();
    const bump = (tid: string, key: string, n: number = 1) => {
      const cur = totalsByTenant.get(tid) ?? {
        pis: 0,
        propostas: 0,
        clientes: 0,
        agencias: 0,
        usuarios: 0,
        mau: 0,
        valor_pi: 0,
      };
      cur[key] = (cur[key] ?? 0) + n;
      totalsByTenant.set(tid, cur);
    };
    for (const p of (profiles.data ?? []) as any[]) if (p.tenant_id) bump(p.tenant_id, "usuarios");
    for (const p of (ativos7d.data ?? []) as any[]) if (p.tenant_id) bump(p.tenant_id, "mau");
    for (const r of (pis.data ?? []) as any[])
      if (r.tenant_id) {
        bump(r.tenant_id, "pis");
        bump(r.tenant_id, "valor_pi", Number(r.valor_negociado || 0));
      }
    for (const r of (propostas.data ?? []) as any[])
      if (r.tenant_id) bump(r.tenant_id, "propostas");
    for (const r of (clientes.data ?? []) as any[]) if (r.tenant_id) bump(r.tenant_id, "clientes");
    for (const r of (agencias.data ?? []) as any[]) if (r.tenant_id) bump(r.tenant_id, "agencias");

    const top = Array.from(totalsByTenant.entries())
      .map(([id, v]) => ({ id, ...(tMap.get(id) ?? {}), ...v }))
      .filter((x) => x.razao_social)
      .sort((a, b) => b.pis + b.propostas - (a.pis + a.propostas))
      .slice(0, 8);

    const pisArr = (pis.data ?? []) as any[];
    const propsArr = (propostas.data ?? []) as any[];
    const pisMes = pisArr.filter((r) => r.created_at >= ini30);
    const valorPisMes = pisMes.reduce((s, r) => s + Number(r.valor_negociado || 0), 0);

    return {
      plataforma: {
        tenants_total: tenantsArr.length,
        usuarios_total: (profiles.data ?? []).length,
        usuarios_ativos_7d: (ativos7d.data ?? []).length,
        pis_total: pisArr.length,
        pis_30d: pisMes.length,
        valor_pis_30d: valorPisMes,
        propostas_total: propsArr.length,
        clientes_total: (clientes.data ?? []).length,
      },
      top_clientes: top,
      vencimentos_proximos: (vencendo.data ?? []) as any[],
      novos_usuarios: ((novos30d.data ?? []) as any[]).map((u) => ({
        ...u,
        tenant_nome: (tMap.get(u.tenant_id) as any)?.razao_social ?? "—",
      })),
    };
  });

/** Relatório financeiro do SaaS (assinaturas dos clientes do mídia.OS) */
export const getOwnerFinanceiro = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const { data, error } = await context.supabase
      .from("tenants")
      .select(
        "id, razao_social, nome_fantasia, plano, ciclo, valor_mensal, status, proximo_vencimento, data_inicio, bloqueado, contato_email, contato_whatsapp, proposta_layout_padrao",
      );
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const in7 = new Date(hoje.getTime() + 7 * 86400000);
    const in30 = new Date(hoje.getTime() + 30 * 86400000);

    const ativos = rows.filter((r) => r.status === "ativo" && !r.bloqueado);
    const inadimplentes = rows.filter((r) => r.status === "inadimplente" || r.bloqueado);
    const trials = rows.filter((r) => r.status === "trial" || r.plano === "demo");

    const mrr = ativos.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);
    const arr = mrr * 12;
    const ticketMedio = ativos.length ? mrr / ativos.length : 0;

    const vencidos = rows.filter(
      (r) => r.proximo_vencimento && new Date(r.proximo_vencimento) < hoje && !r.bloqueado,
    );
    const valorVencido = vencidos.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);
    const valorBloqueado = inadimplentes.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);

    const venc7 = rows.filter(
      (r) =>
        r.proximo_vencimento &&
        new Date(r.proximo_vencimento) >= hoje &&
        new Date(r.proximo_vencimento) <= in7,
    );
    const venc30 = rows.filter(
      (r) =>
        r.proximo_vencimento &&
        new Date(r.proximo_vencimento) >= hoje &&
        new Date(r.proximo_vencimento) <= in30,
    );
    const valorVenc7 = venc7.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);
    const valorVenc30 = venc30.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);

    const porPlano = new Map<string, { plano: string; clientes: number; mrr: number }>();
    for (const r of ativos) {
      const key = r.plano || "—";
      const cur = porPlano.get(key) ?? { plano: key, clientes: 0, mrr: 0 };
      cur.clientes += 1;
      cur.mrr += Number(r.valor_mensal || 0);
      porPlano.set(key, cur);
    }

    return {
      resumo: {
        mrr,
        arr,
        ticket_medio: ticketMedio,
        clientes_ativos: ativos.length,
        clientes_trial: trials.length,
        clientes_inadimplentes: inadimplentes.length,
        valor_vencido: valorVencido,
        valor_bloqueado: valorBloqueado,
        valor_a_receber_7d: valorVenc7,
        valor_a_receber_30d: valorVenc30,
      },
      por_plano: Array.from(porPlano.values()).sort((a, b) => b.mrr - a.mrr),
      vencidos: vencidos
        .sort((a, b) => +new Date(a.proximo_vencimento) - +new Date(b.proximo_vencimento))
        .map((r) => ({
          id: r.id,
          razao_social: r.razao_social,
          plano: r.plano,
          valor_mensal: Number(r.valor_mensal || 0),
          proximo_vencimento: r.proximo_vencimento,
          dias_atraso: Math.floor((+hoje - +new Date(r.proximo_vencimento)) / 86400000),
          contato_email: r.contato_email,
          contato_whatsapp: r.contato_whatsapp,
        })),
      a_receber: venc30
        .sort((a, b) => +new Date(a.proximo_vencimento) - +new Date(b.proximo_vencimento))
        .map((r) => ({
          id: r.id,
          razao_social: r.razao_social,
          plano: r.plano,
          valor_mensal: Number(r.valor_mensal || 0),
          proximo_vencimento: r.proximo_vencimento,
          dias_para_vencer: Math.ceil((+new Date(r.proximo_vencimento) - +hoje) / 86400000),
          contato_email: r.contato_email,
          contato_whatsapp: r.contato_whatsapp,
        })),
    };
  });

export const upsertTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: TenantInput) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const payload: any = { ...data };
    if (!data.id) payload.created_by = context.userId;

    let res = data.id
      ? await context.supabase.from("tenants").update(payload).eq("id", data.id).select().single()
      : await context.supabase.from("tenants").insert(payload).select().single();

    // Se alguma coluna nova ainda não existe no cache do Supabase
    if (res.error && (res.error.message.includes("schema cache") || res.error.message.includes("column") || res.error.message.includes("modelos_proposta"))) {
      console.warn("Aviso: coluna não encontrada no schema cache ao salvar tenant:", res.error.message);
      delete payload.modelos_proposta;
      delete payload.modulos_override;
      delete payload.max_usuarios_override;
      delete payload.categorias_servicos;
      delete payload.proposta_layout_padrao;
      res = data.id
        ? await context.supabase.from("tenants").update(payload).eq("id", data.id).select().single()
        : await context.supabase.from("tenants").insert(payload).select().single();
    }

    if (res.error) throw new Error(res.error.message);
    return res.data;
  });

export const deleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase.from("tenants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Detalhes do cliente: dados + usuários (com último login) + histórico de uso */
export const getTenantDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: tenant, error: tErr } = await context.supabase
      .from("tenants")
      .select("*")
      .eq("id", data.id)
      .single();
    if (tErr) throw new Error(tErr.message);

    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, nome, email, cargo, ativo, created_at, last_active_at")
      .eq("tenant_id", data.id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const usuarios = await Promise.all(
      (profiles ?? []).map(async (p: any) => {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.id);
        const lastSignIn = u?.user?.last_sign_in_at ?? null;
        const lastActive = p.last_active_at ?? null;
        const ultimo = [lastSignIn, lastActive].filter(Boolean).sort().pop() ?? null;
        return {
          ...p,
          last_sign_in_at: ultimo,
          banned_until: (u?.user as any)?.banned_until ?? null,
        };
      }),
    );

    const userIds = (profiles ?? []).map((p: any) => p.id);
    let historico: any[] = [];
    if (userIds.length) {
      const { data: hist } = await context.supabase
        .from("auditoria_alteracoes")
        .select("id, user_id, tabela, operacao, registro_id, created_at")
        .in("user_id", userIds)
        .order("created_at", { ascending: false })
        .limit(50);
      historico = hist ?? [];
    }

    const [pisR, propsR, cliR, agR, prodR] = await Promise.all([
      context.supabase
        .from("pis")
        .select("id, valor_negociado, status, created_at", { count: "exact" })
        .eq("tenant_id", data.id),
      context.supabase
        .from("propostas")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.id),
      context.supabase
        .from("clientes")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.id),
      context.supabase
        .from("agencias")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.id),
      context.supabase
        .from("produtos")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.id),
    ]);
    const pisRows = (pisR.data ?? []) as any[];
    const stats = {
      pis: pisR.count ?? 0,
      propostas: propsR.count ?? 0,
      clientes: cliR.count ?? 0,
      agencias: agR.count ?? 0,
      produtos: prodR.count ?? 0,
      valor_pis: pisRows.reduce((s, r) => s + Number(r.valor_negociado || 0), 0),
      pis_aprovados: pisRows.filter((r) =>
        ["aprovado", "faturado", "veiculado", "encerrado"].includes(r.status),
      ).length,
      ultima_atividade:
        pisRows
          .map((r) => r.created_at)
          .sort()
          .pop() ?? null,
    };

    return { tenant, usuarios, historico, stats };
  });

export const setTenantAlerta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; mensagem: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("tenants")
      .update({ mensagem_alerta: data.mensagem || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTenantBloqueio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; bloqueado: boolean; motivo?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { error } = await context.supabase
      .from("tenants")
      .update({
        bloqueado: data.bloqueado,
        bloqueado_em: data.bloqueado ? new Date().toISOString() : null,
        bloqueado_motivo: data.bloqueado ? (data.motivo ?? null) : null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    // Banuje/desbanuje usuários do tenant via Admin API
    const { data: profs } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", data.id);
    const ids = (profs ?? []).map((p: any) => p.id);
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const banned_until = data.bloqueado ? "2099-12-31T23:59:59Z" : "none";
      await Promise.all(
        ids.map((uid) =>
          supabaseAdmin.auth.admin.updateUserById(uid, { ban_duration: banned_until } as any),
        ),
      );
    }
    return { ok: true };
  });

/** Renova o vencimento do cliente em N dias (a partir do vencimento atual ou hoje) e marca status=ativo. */
export const renovarTenantVencimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; dias?: number }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const dias = data.dias ?? 30;
    const { data: t, error: e1 } = await context.supabase
      .from("tenants")
      .select("proximo_vencimento")
      .eq("id", data.id)
      .single();
    if (e1) throw new Error(e1.message);
    const base = t?.proximo_vencimento ? new Date(t.proximo_vencimento) : new Date();
    if (base.getTime() < Date.now()) base.setTime(Date.now());
    base.setDate(base.getDate() + dias);
    const proximo = base.toISOString().slice(0, 10);
    const { error } = await context.supabase
      .from("tenants")
      .update({ proximo_vencimento: proximo, status: "ativo" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, proximo_vencimento: proximo };
  });

/** Desloga um usuário específico (revoga sessões via Admin API). */
export const signOutUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const res = await fetch(`${url}/auth/v1/admin/users/${data.user_id}/logout`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "global" }),
    });
    if (!res.ok && res.status !== 204) {
      throw new Error(`Falha ao deslogar (${res.status}): ${await res.text()}`);
    }
    return { ok: true };
  });

/** Desloga todos os usuários de uma empresa (tenant). */
export const signOutTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { data: profs, error } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    const ids = (profs ?? []).map((p: any) => p.id as string);
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    await Promise.all(
      ids.map((uid) =>
        fetch(`${url}/auth/v1/admin/users/${uid}/logout`, {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ scope: "global" }),
        }),
      ),
    );
    return { ok: true, total: ids.length };
  });

/** Bloqueia automaticamente todos os tenants com vencimento atrasado. */
export const autoBloquearInadimplentes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context);
    const hoje = new Date().toISOString().slice(0, 10);
    const { data: vencidos, error } = await context.supabase
      .from("tenants")
      .select("id, razao_social")
      .lt("proximo_vencimento", hoje)
      .eq("bloqueado", false);
    if (error) throw new Error(error.message);
    const lista = (vencidos ?? []) as Array<{ id: string; razao_social: string }>;
    if (!lista.length) return { ok: true, total: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    for (const t of lista) {
      await context.supabase
        .from("tenants")
        .update({
          bloqueado: true,
          bloqueado_em: new Date().toISOString(),
          bloqueado_motivo: "Pagamento em atraso (bloqueio automático)",
          status: "inadimplente",
        })
        .eq("id", t.id);
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id")
        .eq("tenant_id", t.id);
      const ids = ((profs ?? []) as any[]).map((p) => p.id);
      await Promise.all(
        ids.map((uid) =>
          supabaseAdmin.auth.admin.updateUserById(uid, {
            ban_duration: "2099-12-31T23:59:59Z",
          } as any),
        ),
      );
    }
    return { ok: true, total: lista.length };
  });

/** Para o app: lê apenas a mensagem de alerta / bloqueio do tenant do próprio usuário. */
export const getMyTenantAlert = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.tenant_id) return null;
    const { data: t } = await context.supabase
      .from("tenants")
      .select(
        "razao_social, mensagem_alerta, bloqueado, bloqueado_motivo, proximo_vencimento, status",
      )
      .eq("id", prof.tenant_id)
      .single();
    return t;
  });

/** Branding (logo + nome) do tenant do próprio usuário, para exibir no AppShell. */
export const getMyTenantBranding = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.tenant_id) return null;
    const { data: t } = await context.supabase
      .from("tenants")
      .select(
        "razao_social, nome_fantasia, logo_url, status, plano, produto_marca, cor_primaria, dominio_proprio",
      )
      .eq("id", prof.tenant_id)
      .single();
    return t as {
      razao_social: string;
      nome_fantasia: string | null;
      logo_url: string | null;
      status: string | null;
      plano: string | null;
      produto_marca: string | null;
      cor_primaria: string | null;
      dominio_proprio: string | null;
    } | null;
  });

/** Retorna o perfil completo da empresa (tenant) vinculada ao usuário logado */
export const getMeuTenantPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .single();
    if (!prof?.tenant_id) return null;
    let { data: t, error } = await context.supabase
      .from("tenants")
      .select(
        "id, razao_social, nome_fantasia, cnpj, contato_nome, contato_email, contato_whatsapp, logo_url, favicon_url, cor_primaria, cor_secundaria, produto_marca, status, plano, proximo_vencimento, subdominio, dominio_proprio, prefixo_pi, prefixo_proposta, comissao_padrao_pct, created_at",
      )
      .eq("id", prof.tenant_id)
      .maybeSingle();

    if (error && (error.message?.includes("schema cache") || error.message?.includes("column"))) {
      console.warn("Aviso: Falha ao consultar colunas específicas do tenant, fallback para select(*):", error.message);
      const fallback = await context.supabase
        .from("tenants")
        .select("*")
        .eq("id", prof.tenant_id)
        .maybeSingle();
      t = fallback.data;
      error = fallback.error;
    }

    if (error) throw new Error(error.message);
    return t;
  });

/** Permite que administradores da empresa atualizem os dados cadastrais e white-label da sua própria empresa */
export const updateMeuTenantPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      razao_social: string;
      nome_fantasia?: string | null;
      cnpj?: string | null;
      contato_nome?: string | null;
      contato_email?: string | null;
      contato_whatsapp?: string | null;
      logo_url?: string | null;
      favicon_url?: string | null;
      cor_primaria?: string | null;
      cor_secundaria?: string | null;
      subdominio?: string | null;
      dominio_proprio?: string | null;
      prefixo_pi?: string | null;
      prefixo_proposta?: string | null;
      comissao_padrao_pct?: number | null;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: userAuth } = await supabase.auth.getUser();
    const isSuper = isMasterEmail(userAuth?.user?.email);
    if (!isSuper) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"]);
      if (!roles || roles.length === 0) {
        throw new Error("Apenas administradores podem atualizar os dados da empresa");
      }
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    if (!prof?.tenant_id) throw new Error("Usuário não está vinculado a nenhuma empresa");

    const updatePayload: Record<string, any> = {
      razao_social: data.razao_social.trim(),
      nome_fantasia: data.nome_fantasia?.trim() || null,
      cnpj: data.cnpj?.trim() || null,
      contato_nome: data.contato_nome?.trim() || null,
      contato_email: data.contato_email?.trim() || null,
      contato_whatsapp: data.contato_whatsapp?.trim() || null,
      logo_url: data.logo_url || null,
      favicon_url: data.favicon_url || null,
      cor_primaria: data.cor_primaria || null,
      cor_secundaria: data.cor_secundaria || null,
      subdominio: data.subdominio?.trim().toLowerCase() || null,
      dominio_proprio: data.dominio_proprio?.trim().toLowerCase() || null,
      prefixo_pi: data.prefixo_pi?.trim().toUpperCase() || "PI",
      prefixo_proposta: data.prefixo_proposta?.trim().toUpperCase() || "PROP",
      comissao_padrao_pct: data.comissao_padrao_pct !== undefined ? Number(data.comissao_padrao_pct) : 20,
    };

    let { error } = await supabase
      .from("tenants")
      .update(updatePayload)
      .eq("id", prof.tenant_id);

    // Fallback defensivo: se colunas opcionais (white-label) ainda não existem na tabela
    if (error && (error.message?.includes("schema cache") || error.message?.includes("column"))) {
      console.warn("Aviso ao atualizar perfil do tenant (schema cache), fallback para campos essenciais:", error.message);
      const safePayload = {
        razao_social: updatePayload.razao_social,
        nome_fantasia: updatePayload.nome_fantasia,
        cnpj: updatePayload.cnpj,
        contato_nome: updatePayload.contato_nome,
        contato_email: updatePayload.contato_email,
        contato_whatsapp: updatePayload.contato_whatsapp,
      };
      const retry = await supabase
        .from("tenants")
        .update(safePayload)
        .eq("id", prof.tenant_id);
      error = retry.error;
    }

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cria um usuário já vinculado a um inquilino (somente proprietário da plataforma). */
export const createTenantUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      tenant_id: string;
      nome: string;
      email: string;
      password: string;
      cargo?: string | null;
      telefone?: string | null;
      roles: string[];
    }) => d,
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const nome = (data.nome ?? "").trim();
    const email = (data.email ?? "").trim().toLowerCase();
    const roles = (data.roles ?? []).filter(Boolean);
    if (nome.length < 3) throw new Error("Informe o nome completo");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido");
    if ((data.password ?? "").length < 6) throw new Error("A senha deve ter ao menos 6 caracteres");
    if (roles.length === 0) throw new Error("Selecione ao menos um perfil");

    // Respeita o limite de usuários do plano
    const [{ data: limite }, { count }] = await Promise.all([
      context.supabase.rpc("tenant_user_limit", { _tenant_id: data.tenant_id }),
      context.supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", data.tenant_id),
    ]);
    if (limite != null && (count ?? 0) >= Number(limite)) {
      throw new Error(`Limite de usuários do plano atingido (${limite}).`);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome, telefone: data.telefone ?? null },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Falha ao criar usuário");

    await supabaseAdmin
      .from("profiles")
      .update({
        nome,
        email,
        cargo: data.cargo ?? null,
        telefone: data.telefone ?? null,
        tenant_id: data.tenant_id,
        trial_ends_at: null,
      })
      .eq("id", newId);

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert(roles.map((role) => ({ user_id: newId, role: role as any })));
    if (rErr) throw new Error(rErr.message);

    return { ok: true, user_id: newId };
  });

/** Vincula (ou move) um usuário existente para um inquilino, buscando por e-mail. */
export const vincularUsuarioTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string; email: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const email = (data.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("Informe o e-mail do usuário");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof, error } = await supabaseAdmin
      .from("profiles")
      .select("id, tenant_id")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!prof) throw new Error("Nenhum usuário encontrado com esse e-mail");
    if (prof.tenant_id === data.tenant_id) throw new Error("Usuário já pertence a este inquilino");

    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: data.tenant_id })
      .eq("id", prof.id);
    if (uErr) throw new Error(uErr.message);
    return { ok: true, user_id: prof.id };
  });

/** Remove o vínculo de um usuário com o inquilino (não exclui a conta). */
export const desvincularUsuarioTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string }) => d)
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ tenant_id: null })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
