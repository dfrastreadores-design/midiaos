import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { executeDriveSync, executeDrivePreview } from "@/lib/services/drive-sync-service";
import type { DriveSyncSummary, DrivePreviewReport } from "@/types/drive-sync.types";

/**
 * Server function para gerar a PRÉVIA interativa e dinâmica do Google Drive
 * STRICTLY READ-ONLY: Não grava, não altera e não exclui nenhum registro no banco de dados.
 */
export const gerarPreviaDriveSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: { customFolderId?: string } | undefined) => data)
  .handler(async ({ context, data }): Promise<DrivePreviewReport> => {
    // 1. Obter tenant do usuário autenticado
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("id, email, tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    const userTenantId = profile?.tenant_id || null;

    // 2. Executar descoberta, classificação semântica e auditoria em modo prévia
    const report = await executeDrivePreview(
      context.supabase,
      userTenantId,
      data?.customFolderId || null,
    );

    return report;
  });

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
