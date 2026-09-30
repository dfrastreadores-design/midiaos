import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import {
  getPlatformConfig,
  DEFAULT_PLATFORM_CONFIG,
  type PlatformConfig,
} from "@/lib/platform-config.functions";

export function usePlatformConfig() {
  const { user } = useAuth();
  const fn = useServerFn(getPlatformConfig);
  const { data } = useQuery({
    queryKey: ["platform-config"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const config: PlatformConfig = data ?? DEFAULT_PLATFORM_CONFIG;
  return {
    config,
    isMultiEmpresa: config.multi_empresa,
    isSingleEmpresa: !config.multi_empresa,
    loaded: !!data,
  };
}
