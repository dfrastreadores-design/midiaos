import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyTenantPlano } from "@/lib/planos.functions";
import { useAuth } from "@/hooks/use-auth";

export function useTenantModulos() {
  const { user } = useAuth();
  const fn = useServerFn(getMyTenantPlano);
  const { data } = useQuery({
    queryKey: ["my-tenant-plano"],
    queryFn: () => fn(),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });
  const modulos = data?.modulos ?? [];
  return {
    plano: data?.plano ?? null,
    modulos,
    userLimit: data?.user_limit ?? null,
    userCount: data?.user_count ?? 0,
    hasModulo: (key: string) => modulos.length === 0 || modulos.includes(key),
    loaded: !!data,
  };
}
