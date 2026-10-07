import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeDriveSync } from "@/lib/services/drive-sync-service";
import type { DriveSyncSummary } from "@/types/drive-sync.types";

/**
 * Server function para sincronizar parceiros, materiais e inventário a partir do Google Drive
 */
export const sincronizarDriveParceiros = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DriveSyncSummary> => {
    // 1. Obter tenant do usuário autenticado
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    const userTenantId = profile?.tenant_id || null;

    // 2. Executar sincronização completa e idempotente
    const result = await executeDriveSync(context.supabase, userTenantId);
    return result;
  });
