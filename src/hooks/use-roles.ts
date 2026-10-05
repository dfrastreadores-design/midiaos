import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { isMasterEmail } from "@/lib/master-user";

// Mapeamento de rota → chave de permissão de módulo.
// Rotas sem mapeamento (ex.: "/", "/minha-conta") são liberadas para qualquer usuário autenticado.
// "/usuarios" e "/configuracoes" são SEMPRE restritos a admin.
export const ROUTE_PERMISSION: Record<string, string> = {
  "/crm": "module.crm",
  "/clientes": "module.clientes",
  "/agencias": "module.agencias",
  "/produtos": "module.produtos",
  "/parceiros": "module.produtos",
  "/pi": "module.pi",
  "/propostas": "module.propostas",
  "/briefings": "module.briefings",
  "/financeiro": "module.financeiro",
  "/calendario": "module.calendario",
  "/relatorios": "module.relatorios",
  "/metas": "module.metas",
  "/historico-veiculacao": "module.pi",
  "/comissoes": "module.comissoes",
  "/tarefas": "module.crm",
  "/landing-pages": "module.landing_pages",
  "/influenciadores": "module.influenciadores",
  "/materiais-apoio": "module.propostas",
};

const EXECUTIVO_OR_ADMIN_ROUTES = new Set(["/pi-anexos"]);

const ADMIN_ONLY_ROUTES = new Set(["/usuarios", "/configuracoes", "/historico"]);

export function useUserRoles() {
  const { user, loading } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [adminManaged, setAdminManaged] = useState(false);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setRoles([]);
      setPerms(new Set());
      setAdminManaged(false);
      setRolesLoading(loading);
      return;
    }
    if (isMasterEmail(user.email)) {
      setRoles(["admin", "super_admin", "diretoria", "executivo"]);
      setPerms(new Set(["*"]));
      setAdminManaged(false);
      setRolesLoading(false);
      return;
    }

    setRolesLoading(true);
    (async () => {
      try {
        const { data: roleRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const userRoles = (roleRows ?? []).map((r) => r.role as AppRole);
        let permKeys = new Set<string>();
        if (userRoles.length > 0) {
          const { data: rp } = await supabase
            .from("role_permissions")
            .select("permission_key")
            .in("role", userRoles);
          permKeys = new Set((rp ?? []).map((r) => r.permission_key as string));
        }
        // Verifica se o perfil admin foi configurado (alguma linha em role_permissions)
        const { data: adminRows } = await supabase
          .from("role_permissions")
          .select("permission_key")
          .eq("role", "admin")
          .limit(1);
        if (!active) return;
        setRoles(userRoles);
        setPerms(permKeys);
        setAdminManaged((adminRows?.length ?? 0) > 0);
      } catch (err) {
        console.warn("useUserRoles: erro ao carregar permissões:", err);
      } finally {
        if (active) setRolesLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, loading]);

  const isSuperAdmin = isMasterEmail(user?.email);
  const isAdmin = isSuperAdmin || roles.includes("admin") || roles.includes("super_admin");
  const isDiretoria = isSuperAdmin || roles.includes("diretoria");
  const isParceiroComercial = !isSuperAdmin && roles.includes("parceiro_comercial");

  const can = (path: string) => {
    // O usuário rafaelrodrigo.as@gmail.com possui acesso irrestrito a todas as áreas
    if (isSuperAdmin) return true;

    // Bloqueio rigoroso de rotas restritas de plataforma para qualquer outro usuário
    if (path.startsWith("/owner")) return false;
    if (path === "/monitoramento") return false;

    if (
      path === "/usuarios" ||
      path === "/configuracoes" ||
      path === "/relatorio-sincronizacao" ||
      path === "/layouts"
    )
      return isAdmin;
    if (ADMIN_ONLY_ROUTES.has(path)) return isAdmin;

    // Influenciadores: somente admin e produção
    if (path === "/influenciadores") return isAdmin || roles.includes("producao");

    // Parceiro Comercial: acesso EXCLUSIVO a briefings
    if (isParceiroComercial && !isAdmin) {
      const allowed = new Set(["/", "/minha-conta", "/briefings"]);
      return allowed.has(path);
    }

    if (EXECUTIVO_OR_ADMIN_ROUTES.has(path)) return isAdmin || roles.includes("executivo");
    const permKey = ROUTE_PERMISSION[path];
    if (!permKey) return true;
    if (isAdmin) return !adminManaged || perms.has(permKey);
    return perms.has(permKey);
  };
  const hasPermission = (key: string) =>
    isSuperAdmin || (isAdmin && !adminManaged) || perms.has(key);

  return {
    roles,
    isAdmin,
    isSuperAdmin,
    isDiretoria,
    isParceiroComercial,
    can,
    hasPermission,
    permissions: perms,
    loading: rolesLoading,
  };
}
