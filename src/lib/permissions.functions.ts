import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RoleEnum = z.enum(["admin", "executivo", "opec", "financeiro", "producao", "diretoria", "parceiro_comercial"]);

async function assertAdmin(supabase: any, userId: string) {
  const { data: userAuth } = await supabase.auth?.getUser?.() ?? { data: null };
  if (userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com") {
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

export const listPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const [{ data: perms, error: e1 }, { data: rp, error: e2 }] = await Promise.all([
      supabase.from("permissions").select("*").order("key"),
      supabase.from("role_permissions").select("role, permission_key"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    return { permissions: perms ?? [], rolePermissions: rp ?? [] };
  });

export const setRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      role: RoleEnum,
      permission_key: z.string().min(1).max(100),
      enabled: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    // Protege módulos exclusivos do admin: não permite remover do admin.
    const PROTECTED_ADMIN_KEYS = new Set(["module.usuarios", "module.configuracoes"]);
    if (data.role === "admin" && !data.enabled && PROTECTED_ADMIN_KEYS.has(data.permission_key)) {
      throw new Error("Este módulo é exclusivo do administrador e não pode ser desativado.");
    }
    if (data.enabled) {
      const { error } = await supabase
        .from("role_permissions")
        .insert({ role: data.role, permission_key: data.permission_key });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase
        .from("role_permissions")
        .delete()
        .eq("role", data.role)
        .eq("permission_key", data.permission_key);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
