import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isMasterEmail } from "@/lib/master-user";

const RoleEnum = z.enum([
  "admin",
  "executivo",
  "opec",
  "financeiro",
  "diretoria",
  "producao",
  "parceiro_comercial",
  "teste",
]);

async function assertAdmin(supabase: any, userId: string) {
  const { data: userAuth } = await supabase.auth.getUser();
  if (isMasterEmail(userAuth?.user?.email)) {
    return;
  }
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas administradores podem executar esta ação");
}

async function logAuditoria(
  actor: { id: string; email?: string | null },
  entry: {
    acao: string;
    target_user_id?: string | null;
    target_email?: string | null;
    role?: string | null;
    detalhes?: Record<string, unknown> | null;
  },
) {
  try {
    await supabaseAdmin.from("auditoria_acessos").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? null,
      acao: entry.acao,
      target_user_id: entry.target_user_id ?? null,
      target_email: entry.target_email ?? null,
      role: entry.role ?? null,
      detalhes: (entry.detalhes ?? null) as any,
    });
  } catch {
    /* never block the main action */
  }
}

async function getActor(supabase: any, userId: string) {
  const { data } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  return { id: userId, email: (data?.email as string) ?? null };
}

async function getTargetEmail(targetId: string) {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", targetId)
    .maybeSingle();
  return (data?.email as string) ?? null;
}

export const listUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Descobre se é o Super Admin exclusivo (rafaelrodrigo.as@gmail.com) e qual o tenant do solicitante
    const [{ data: userAuth }, { data: meProfile }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("tenant_id").eq("id", userId).maybeSingle(),
    ]);
    const isSuper = isMasterEmail(userAuth?.user?.email);
    const myTenant = (meProfile as any)?.tenant_id ?? null;

    let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (!isSuper) {
      // Limita rigorosamente ao tenant da empresa do usuário logado
      query = query.is("trial_ends_at", null);
      if (myTenant) query = query.eq("tenant_id", myTenant);
      else query = query.is("tenant_id", null);
    }

    const [{ data: profiles, error: pErr }, { data: roles, error: rErr }] = await Promise.all([
      query,
      supabase.from("user_roles").select("user_id, role"),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (rErr) throw new Error(rErr.message);
    const byUser = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r.role as string);
      byUser.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p) => ({ ...p, roles: byUser.get(p.id) ?? [] }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), role: RoleEnum, enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: userAuth } = await supabase.auth.getUser();
    const isSuper = isMasterEmail(userAuth?.user?.email);
    if (data.role === ("super_admin" as any) && !isSuper) {
      throw new Error(
        "Apenas o proprietário da plataforma pode gerenciar a função super_admin",
      );
    }

    if (data.enabled) {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: data.user_id, role: data.role });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }
    const actor = await getActor(supabase, userId);
    const targetEmail = await getTargetEmail(data.user_id);
    await logAuditoria(actor, {
      acao: data.enabled ? "papel_concedido" : "papel_revogado",
      target_user_id: data.user_id,
      target_email: targetEmail,
      role: data.role,
    });
    return { ok: true };
  });

export const toggleUserAtivo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), ativo: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.user_id);
    if (error) throw new Error(error.message);
    if (!data.ativo) {
      const { error: delErr } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id);
      if (delErr) throw new Error(delErr.message);
    }
    try {
      await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
        ban_duration: data.ativo ? "none" : "876000h",
      } as any);
    } catch {
      /* ignore */
    }
    const actor = await getActor(supabase, userId);
    const targetEmail = await getTargetEmail(data.user_id);
    await logAuditoria(actor, {
      acao: data.ativo ? "usuario_ativado" : "usuario_desativado",
      target_user_id: data.user_id,
      target_email: targetEmail,
    });
    return { ok: true };
  });

export const createUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        password: z.string().min(6).max(72),
        nome: z.string().trim().min(3, "Informe o nome completo").max(120),
        cargo: z.string().trim().max(120).optional().nullable(),
        telefone: z.string().trim().min(8, "Informe um telefone válido").max(20),
        roles: z.array(RoleEnum).min(1).max(4),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { data: userAuth } = await supabase.auth.getUser();
    const isSuper = isMasterEmail(userAuth?.user?.email);

    // Bloqueia qualquer tentativa de conceder super_admin
    if (data.roles.includes("super_admin" as any) && !isSuper) {
      throw new Error("Apenas o proprietário da plataforma pode criar super administradores");
    }

    // Busca o tenant_id do criador (administrador)
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .maybeSingle();

    const targetTenantId = creatorProfile?.tenant_id ?? null;

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nome: data.nome, telefone: data.telefone },
    });
    if (error) throw new Error(error.message);
    const newId = created.user?.id;
    if (!newId) throw new Error("Falha ao criar usuário");

    // Garante nome completo, telefone e vinculação OBRIGATÓRIA ao tenant da empresa
    await supabaseAdmin
      .from("profiles")
      .update({
        nome: data.nome,
        telefone: data.telefone,
        cargo: data.cargo ?? null,
        tenant_id: targetTenantId,
      })
      .eq("id", newId);

    // handle_new_user trigger may have assigned a default role; reset to requested
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newId);
    const rows = data.roles.map((role) => ({ user_id: newId, role }));
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert(rows);
    if (rErr) throw new Error(rErr.message);

    const actor = await getActor(supabase, userId);
    await logAuditoria(actor, {
      acao: "usuario_criado",
      target_user_id: newId,
      target_email: data.email,
      detalhes: { nome: data.nome, roles: data.roles },
    });

    return { ok: true, user_id: newId };
  });

export const listAuditoriaAcessos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { data, error } = await supabaseAdmin
      .from("auditoria_acessos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getMeuPerfil = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile, error }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    if (error) throw new Error(error.message);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    return { profile, isAdmin, roles: (roles ?? []).map((r) => r.role as string) };
  });

export const updateUsuarioPerfil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        nome: z.string().trim().min(3).max(120),
        cargo: z.string().trim().max(120).nullable().optional(),
        telefone: z.string().trim().max(20).nullable().optional(),
        whatsapp: z.string().trim().max(20).nullable().optional(),
        email: z.string().email().max(255).optional(),
        password: z.string().min(6).max(72).optional().or(z.literal("")),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const isSelf = data.user_id === userId;
    let isAdmin = false;
    if (!isSelf) {
      await assertAdmin(supabase, userId);
      isAdmin = true;
    } else {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      isAdmin = !!r;
    }

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({
        nome: data.nome,
        cargo: data.cargo ?? null,
        telefone: data.telefone ?? null,
        whatsapp: data.whatsapp ?? null,
      })
      .eq("id", data.user_id);
    if (pErr) throw new Error(pErr.message);

    // Email/senha: usuário pode mudar a própria; admin pode mudar de qualquer um
    const authUpdate: Record<string, unknown> = {};
    if (data.email) authUpdate.email = data.email;
    if (data.password) authUpdate.password = data.password;
    if (Object.keys(authUpdate).length > 0) {
      if (!isSelf && !isAdmin) throw new Error("Sem permissão");
      try {
        await supabaseAdmin.auth.admin.updateUserById(data.user_id, authUpdate as any);
        if (data.email) {
          await supabaseAdmin.from("profiles").update({ email: data.email }).eq("id", data.user_id);
        }
      } catch (e: any) {
        throw new Error(e?.message || "Falha ao atualizar credenciais");
      }
    }

    return { ok: true };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(6).max(72) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);

    const actor = await getActor(supabase, userId);
    const targetEmail = await getTargetEmail(data.user_id);
    await logAuditoria(actor, {
      acao: "senha_redefinida",
      target_user_id: data.user_id,
      target_email: targetEmail,
    });

    return { ok: true };
  });

export const deleteUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.user_id === userId) throw new Error("Você não pode excluir sua própria conta");

    const actor = await getActor(supabase, userId);
    const targetEmail = await getTargetEmail(data.user_id);

    // Remove roles e profile primeiro (FKs do app)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", data.user_id);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);

    await logAuditoria(actor, {
      acao: "usuario_excluido",
      target_user_id: data.user_id,
      target_email: targetEmail,
    });

    return { ok: true };
  });
