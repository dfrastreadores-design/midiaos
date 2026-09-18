import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle } from "lucide-react";
import { getMyTenantAlert } from "@/lib/tenants.functions";

export function TenantAlertBanner() {
  const fn = useServerFn(getMyTenantAlert);
  const { data } = useQuery({
    queryKey: ["my-tenant-alert"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
  const msg = data?.mensagem_alerta?.trim();
  if (!msg) return null;
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2.5 flex items-center gap-2 text-amber-900 dark:text-amber-200 text-sm">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="font-medium">{msg}</span>
    </div>
  );
}
