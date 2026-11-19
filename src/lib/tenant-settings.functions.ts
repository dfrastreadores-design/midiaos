import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MODULOS_DISPONIVEIS = [
  {
    id: "OOH",
    label: "Mídia Exterior (OOH)",
    desc: "Frontlights, Outdoors, Empenas, Painéis Rodoviários, Totens",
    canal: "OFF",
  },
  {
    id: "DOOH",
    label: "Mídia Digital Exterior (DOOH)",
    desc: "Painéis Digitais LED de rua, Elevadores, Displays em Gastronomia e Varejo",
    canal: "OFF",
  },
  {
    id: "RADIO",
    label: "Rádio / Áudio",
    desc: "Spots 30s/15s, Testemunhais, Patrocínios de programas e podcasts",
    canal: "OFF",
  },
  {
    id: "DIGITAL",
    label: "Digital / Portais / Web",
    desc: "Banners em portais de notícias, Publieditoriais, Redes Sociais e Cobertura",
    canal: "ON",
  },
  {
    id: "PRINT",
    label: "Mídia Impressa",
    desc: "Jornais impressos, Revistas, Encartes e Folders",
    canal: "OFF",
  },
  {
    id: "TV",
    label: "Televisão / Broadcast",
    desc: "Inserções comerciais 30s/15s, Merchandising, Patrocínios e Vinhetas",
    canal: "OFF",
  },
  {
    id: "CUSTOM",
    label: "Formatos Customizados",
    desc: "Formatos livres e projetos especiais definidos pelo inquilino",
    canal: "OFF",
  },
  {
    id: "PI_FINANCEIRO",
    label: "Gestão Financeira de PIs & Comissões",
    desc: "Módulo financeiro de pedidos de inserção, faturamento e repasse a parceiros",
    canal: "FIN",
  },
] as const;

export type ModuloId = (typeof MODULOS_DISPONIVEIS)[number]["id"];

export const DEFAULT_MODULOS_ATIVOS: string[] = [
  "OOH",
  "DOOH",
  "RADIO",
  "DIGITAL",
  "PRINT",
  "TV",
  "CUSTOM",
  "PI_FINANCEIRO",
];

export type TenantSettings = {
  id?: string;
  tenant_id?: string | null;
  active_modules: string[];
  modulos_ativos: string[];
  terminologia_veiculo?: string;
};

export const getTenantSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // 1. Obter tenant_id do usuário logado
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id;
    if (!tenantId) {
      return {
        tenant_id: null,
        active_modules: DEFAULT_MODULOS_ATIVOS,
        modulos_ativos: DEFAULT_MODULOS_ATIVOS,
        terminologia_veiculo: "Veículo de Comunicação",
      };
    }

    // 2. Consultar tenant_settings
    try {
      const { data: settings, error } = await context.supabase
        .from("tenant_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!error && settings) {
        const rawMods = settings.active_modules || settings.modulos_ativos;
        const mods = Array.isArray(rawMods) && rawMods.length > 0
          ? rawMods
          : DEFAULT_MODULOS_ATIVOS;

        return {
          id: settings.id,
          tenant_id: tenantId,
          active_modules: mods,
          modulos_ativos: mods,
          terminologia_veiculo: settings.terminologia_veiculo || "Veículo de Comunicação",
        };
      }
    } catch {
      // Ignora erro se tabela não estiver disponível e tenta direto no tenant
    }

    // Fallback: verificar coluna modulos_ativos / active_modules no tenant
    try {
      const { data: tenant } = await context.supabase
        .from("tenants")
        .select("id, modulos_ativos, active_modules")
        .eq("id", tenantId)
        .maybeSingle();

      const rawTenantMods = (tenant as any)?.active_modules || tenant?.modulos_ativos;
      if (rawTenantMods && Array.isArray(rawTenantMods) && rawTenantMods.length > 0) {
        return {
          tenant_id: tenantId,
          active_modules: rawTenantMods,
          modulos_ativos: rawTenantMods,
          terminologia_veiculo: "Veículo de Comunicação",
        };
      }
    } catch {
      // safe fallback
    }

    return {
      tenant_id: tenantId,
      active_modules: DEFAULT_MODULOS_ATIVOS,
      modulos_ativos: DEFAULT_MODULOS_ATIVOS,
      terminologia_veiculo: "Veículo de Comunicação",
    };
  });

const UpdateSettingsSchema = z.object({
  active_modules: z.array(z.string()).min(1, "Selecione ao menos um módulo ativo").optional(),
  modulos_ativos: z.array(z.string()).min(1, "Selecione ao menos um módulo ativo").optional(),
  terminologia_veiculo: z.string().optional().default("Veículo de Comunicação"),
});

export const updateTenantSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: z.infer<typeof UpdateSettingsSchema>) => UpdateSettingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", context.userId)
      .maybeSingle();

    const tenantId = prof?.tenant_id;
    if (!tenantId) {
      throw new Error("Usuário não está vinculado a um inquilino ativo.");
    }

    const modulos = data.active_modules || data.modulos_ativos || DEFAULT_MODULOS_ATIVOS;
    const terminologia = data.terminologia_veiculo || "Veículo de Comunicação";

    // 1. Upsert na tabela tenant_settings
    try {
      const { error: setErr } = await context.supabase.from("tenant_settings").upsert(
        {
          tenant_id: tenantId,
          active_modules: modulos,
          modulos_ativos: modulos,
          terminologia_veiculo: terminologia,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id" },
      );
      if (setErr) {
        console.warn("Aviso ao salvar tenant_settings:", setErr.message);
      }
    } catch (e: any) {
      console.warn("Exceção ao persistir tenant_settings:", e?.message);
    }

    // 2. Também sincronizar colunas no próprio tenant
    try {
      await context.supabase
        .from("tenants")
        .update({
          modulos_ativos: modulos,
          active_modules: modulos,
        })
        .eq("id", tenantId);
    } catch (e: any) {
      console.warn("Aviso ao atualizar colunas em tenants:", e?.message);
    }

    return {
      ok: true,
      active_modules: modulos,
      modulos_ativos: modulos,
      terminologia_veiculo: terminologia,
    };
  });
