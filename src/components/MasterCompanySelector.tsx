import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRoles } from "@/hooks/use-roles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Globe, ShieldCheck } from "lucide-react";
import { formatCNPJ } from "@/lib/cnpj";

export function MasterCompanySelector() {
  const { isMaster, isSuperAdmin } = useUserRoles();
  const [selectedTenantId, setSelectedTenantId] = useState<string>("all");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("midiaos:master_selected_tenant_id");
      if (stored) setSelectedTenantId(stored);
    } catch {
      /* noop */
    }
  }, []);

  const { data: tenants = [] } = useQuery({
    queryKey: ["master-global-tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, razao_social, nome_fantasia, cnpj, status, bloqueado")
        .order("nome_fantasia", { ascending: true });
      if (error) {
        console.warn("Erro ao buscar empresas para o seletor Master:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!(isMaster || isSuperAdmin),
    staleTime: 5 * 60_000,
  });

  if (!isMaster && !isSuperAdmin) {
    return null;
  }

  const handleSelect = (val: string) => {
    setSelectedTenantId(val);
    try {
      if (val === "all") {
        localStorage.removeItem("midiaos:master_selected_tenant_id");
      } else {
        localStorage.setItem("midiaos:master_selected_tenant_id", val);
      }
      window.dispatchEvent(
        new CustomEvent("midiaos:tenant-context-change", { detail: { tenantId: val } }),
      );
    } catch {
      /* noop */
    }
  };

  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px] px-2 py-0.5 font-bold flex items-center gap-1 shrink-0"
        title="Usuário Superadministrador com acesso total e irrestrito"
      >
        <ShieldCheck className="size-3 text-amber-600 dark:text-amber-400" />
        <span>MASTER</span>
      </Badge>

      <div className="hidden xl:flex items-center">
        <Select value={selectedTenantId} onValueChange={handleSelect}>
          <SelectTrigger className="h-8 text-xs font-medium bg-background/80 border-border/60 hover:bg-muted/40 transition-colors w-[260px] rounded-lg">
            <div className="flex items-center gap-1.5 truncate">
              {selectedTenantId === "all" ? (
                <>
                  <Globe className="size-3.5 text-sky-600 shrink-0" />
                  <span className="truncate font-semibold">Todas as Empresas (Global)</span>
                </>
              ) : (
                <>
                  <Building2 className="size-3.5 text-amber-600 shrink-0" />
                  <span className="truncate font-semibold">
                    {selectedTenant?.nome_fantasia || selectedTenant?.razao_social}
                  </span>
                </>
              )}
            </div>
          </SelectTrigger>
          <SelectContent align="start" className="w-[320px] max-h-80">
            <SelectItem value="all" className="text-xs font-semibold py-2">
              <div className="flex items-center gap-2">
                <Globe className="size-3.5 text-sky-600" />
                <span>🌐 Visão Global (Todas as Empresas)</span>
              </div>
            </SelectItem>
            {tenants.map((t) => {
              const displayName = t.nome_fantasia || t.razao_social || "Empresa sem nome";
              const formattedCnpj = t.cnpj ? formatCNPJ(t.cnpj) : null;
              return (
                <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                  <div className="flex flex-col text-left">
                    <span className="font-medium truncate">{displayName}</span>
                    {formattedCnpj && (
                      <span className="text-[10px] text-muted-foreground">CNPJ: {formattedCnpj}</span>
                    )}
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
