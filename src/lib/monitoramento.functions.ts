import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: userAuth } = await supabase.auth.getUser();
  if (userAuth?.user?.email?.toLowerCase() === "rafaelrodrigo.as@gmail.com") {
    return;
  }
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);
  if (!data || data.length === 0) throw new Error("Acesso restrito.");
}

export const getMonitoramentoSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since24 = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // E-mails: dedup por message_id (último status)
    const { data: emailRows } = await supabaseAdmin
      .from("email_send_log")
      .select("message_id, status, created_at, template_name, recipient_email, error_message")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(2000);

    const latestByMsg = new Map<string, any>();
    for (const r of emailRows ?? []) {
      const key = r.message_id ?? `${r.created_at}-${r.recipient_email}`;
      if (!latestByMsg.has(key)) latestByMsg.set(key, r);
    }
    const latest = Array.from(latestByMsg.values());
    const in24 = latest.filter((r) => r.created_at >= since24);
    const count = (arr: any[], s: string) => arr.filter((r) => r.status === s).length;

    const emailStats = {
      total7d: latest.length,
      total24h: in24.length,
      sent24h: count(in24, "sent"),
      failed24h: count(in24, "dlq") + count(in24, "failed") + count(in24, "bounced"),
      suppressed24h: count(in24, "suppressed"),
      pending24h: count(in24, "pending"),
    };

    const emailFailures = latest
      .filter((r) => ["dlq", "failed", "bounced"].includes(r.status))
      .slice(0, 20);

    // Cron runs
    let cronRuns: any[] = [];
    let cronStats = { total: 0, failed: 0, lastFailureAt: null as string | null };
    try {
      const { data: runs } = await supabaseAdmin.rpc("admin_cron_runs", { _limit: 100 });
      cronRuns = runs ?? [];
      cronStats.total = cronRuns.length;
      const failed = cronRuns.filter((r) => r.status !== "succeeded");
      cronStats.failed = failed.length;
      cronStats.lastFailureAt = failed[0]?.start_time ?? null;
    } catch {
      /* ignore */
    }

    // PI recente — últimas 24h por status
    const { data: pisRecent } = await supabaseAdmin
      .from("pis")
      .select("id, numero, status, created_at")
      .gte("created_at", since24)
      .order("created_at", { ascending: false })
      .limit(500);
    const piStats = {
      total24h: (pisRecent ?? []).length,
      rascunho: (pisRecent ?? []).filter((p) => p.status === "rascunho").length,
      cancelado: (pisRecent ?? []).filter((p) => p.status === "cancelado").length,
    };

    // Auditoria — DELETEs e cancelamentos recentes (sinal de ação destrutiva)
    const { data: auditDeletes } = await supabaseAdmin
      .from("auditoria_alteracoes")
      .select("id, tabela, operacao, registro_id, created_at, user_id")
      .eq("operacao", "DELETE")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(20);

    // Tenants em alerta (trial vencendo / vencido)
    // Tenants em alerta (status diferente de ativo)
    const { data: tenantAlert } = await supabaseAdmin
      .from("tenants")
      .select("id, status")
      .neq("status", "ativo")
      .limit(50);

    return {
      generatedAt: new Date().toISOString(),
      emailStats,
      emailFailures,
      cronStats,
      cronRuns: cronRuns.slice(0, 25),
      piStats,
      auditDeletes: auditDeletes ?? [],
      tenantAlert: tenantAlert ?? [],
    };
  });
