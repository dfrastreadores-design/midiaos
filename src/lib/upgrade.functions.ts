import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UpgradeInput = z.object({
  plano_nome: z.string().min(1),
  razao_social: z.string().min(2),
  nome_fantasia: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
  contato_nome: z.string().min(2),
  contato_whatsapp: z.string().optional().nullable(),
});

/**
 * Ativa o plano contratado pelo usuário em teste:
 * cria o tenant da empresa, vincula o profile, limpa trial_ends_at
 * e promove o usuário a admin do próprio tenant.
 */
export const ativarPlanoUpgrade = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => UpgradeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Perfil atual precisa estar em trial
    const { data: prof, error: eProf } = await supabaseAdmin
      .from("profiles")
      .select("id, email, nome, trial_ends_at, tenant_id")
      .eq("id", context.userId)
      .single();
    if (eProf) throw new Error(eProf.message);
    if (!prof?.trial_ends_at && prof?.tenant_id) {
      // Já está ativo — nada a fazer
      return { ok: true, tenant_id: prof.tenant_id };
    }

    // 2) Resolve plano por nome (case-insensitive), com fallback pro default
    const { data: planos } = await supabaseAdmin.from("planos").select("*").eq("ativo", true);
    const plano =
      (planos ?? []).find((p: any) => p.nome.toLowerCase() === data.plano_nome.toLowerCase()) ??
      (planos ?? []).find((p: any) => p.is_default) ??
      (planos ?? [])[0];

    // 3) Cria tenant
    const { data: tenant, error: eTen } = await supabaseAdmin
      .from("tenants")
      .insert({
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia || null,
        cnpj: data.cnpj || null,
        contato_nome: data.contato_nome,
        contato_email: prof.email,
        contato_whatsapp: data.contato_whatsapp || null,
        plano: (plano?.nome ?? data.plano_nome).toLowerCase(),
        valor_mensal: plano?.preco_mensal ?? 0,
        plano_id: plano?.id ?? null,
        max_usuarios: plano?.max_usuarios ?? 5,
        created_by: context.userId,
        status: "ativo",
      })
      .select("id")
      .single();
    if (eTen) throw new Error(eTen.message);

    // 4) Atualiza profile: vincula tenant e encerra o trial
    const { error: eUpd } = await supabaseAdmin
      .from("profiles")
      .update({
        tenant_id: tenant.id,
        trial_ends_at: null,
        nome: data.contato_nome || prof.nome,
      })
      .eq("id", context.userId);
    if (eUpd) throw new Error(eUpd.message);

    // 5) Promove: remove role 'teste' e garante 'admin'
    await supabaseAdmin.from("user_roles").delete().eq("user_id", context.userId).eq("role", "teste");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });

    return { ok: true, tenant_id: tenant.id as string, plano_id: plano?.id ?? null };
  });
