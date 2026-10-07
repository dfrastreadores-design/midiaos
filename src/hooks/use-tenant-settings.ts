import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  getTenantSettings,
  DEFAULT_MODULOS_ATIVOS,
  type TenantSettings,
} from "@/lib/tenant-settings.functions";

export function useTenantSettings() {
  const { user } = useAuth();
  const fetchSettings = useServerFn(getTenantSettings);

  const { data, isLoading } = useQuery<TenantSettings>({
    queryKey: ["tenant-settings"],
    queryFn: () => fetchSettings(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  const activeModules: string[] =
    data?.active_modules || data?.modulos_ativos || DEFAULT_MODULOS_ATIVOS;

  const isModuleActive = (moduleId: string): boolean => {
    if (!activeModules || activeModules.length === 0) return true;
    return activeModules.includes(moduleId);
  };

  const isMediaTypeActive = (mediaType: string): boolean => {
    if (!activeModules || activeModules.length === 0) return true;
    const m = (mediaType || "").toUpperCase().trim();

    if (m === "OOH" || m.includes("OUTDOOR") || m.includes("FRONTLIGHT") || m.includes("EMPENA")) {
      return activeModules.includes("OOH");
    }
    if (m === "DOOH" || m.includes("LED") || m.includes("ELEVADOR") || m.includes("DIGITAL DE RUA")) {
      return activeModules.includes("DOOH");
    }
    if (m === "RADIO" || m === "RÁDIO" || m.includes("SPOT") || m.includes("PODCAST")) {
      return activeModules.includes("RADIO");
    }
    if (m === "DIGITAL" || m.includes("PORTAL") || m.includes("WEB") || m.includes("INTERNET") || m.includes("SOCIAL")) {
      return activeModules.includes("DIGITAL");
    }
    if (m === "PRINT" || m.includes("IMPRESS") || m.includes("JORNAL") || m.includes("REVISTA")) {
      return activeModules.includes("PRINT");
    }
    if (m === "TV" || m.includes("TELEVIS")) {
      return activeModules.includes("TV");
    }
    if (m === "CUSTOM" || m.includes("PROJETO") || m.includes("ESPECIAL")) {
      return activeModules.includes("CUSTOM");
    }

    // Default permissivo para categorias criadas livremente pelo usuário
    return true;
  };

  return {
    settings: data,
    activeModules,
    isModuleActive,
    isMediaTypeActive,
    terminologiaVeiculo: data?.terminologia_veiculo || "Veículo de Comunicação",
    isLoading,
  };
}
