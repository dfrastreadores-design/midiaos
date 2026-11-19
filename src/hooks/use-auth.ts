import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { touchLastActive } from "@/lib/presence.functions";
import { isMasterEmail, isNexoAdminEmail } from "@/lib/master-user";

export type AppRole =
  | "super_admin"
  | "admin"
  | "executivo"
  | "opec"
  | "financeiro"
  | "diretoria"
  | "producao"
  | "parceiro_comercial";

export type AppUserRole =
  | "MASTER"
  | "ADMIN"
  | "OPERATOR"
  | "CLIENT"
  | "VEHICLE"
  | AppRole;

export interface AuthProfile {
  id: string;
  email: string;
  nome: string | null;
  role: AppUserRole;
  cnpj_vinculado: string | null;
  cnpj: string | null;
  tenant_id: string | null;
  is_superadmin: boolean;
}

const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // Limite máximo de 24 horas por sessão
const HEARTBEAT_MS = 5 * 60 * 1000; // 5 minutos

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [role, setRole] = useState<AppUserRole | null>(null);
  const [cnpj, setCnpj] = useState<string | null>(null);
  const [cnpjVinculado, setCnpjVinculado] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isMaster, setIsMaster] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const lastTouchRef = useRef(0);

  const resolveUserProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      setRole(null);
      setCnpj(null);
      setCnpjVinculado(null);
      setTenantId(null);
      setIsMaster(false);
      setIsSuperAdmin(false);
      return;
    }

    // Master Global: estritamente verificado por e-mail no servidor/código seguro
    // Jamais confia em user_metadata do cliente para conceder Master global
    const isMasterByEmail = isMasterEmail(currentUser.email);
    const metaRole = (currentUser.user_metadata?.role as AppUserRole) || null;

    let resolved: AuthProfile | null = null;
    try {
      // 1. Consulta profiles com campos garantidos para evitar 400 Bad Request
      const { data: profRow, error: profErr } = await supabase
        .from("profiles")
        .select("id, email, nome, cnpj_vinculado, cnpj, tenant_id, is_superadmin")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profErr) {
        console.warn("useAuth: aviso ao consultar profiles:", profErr.message);
      }

      // 2. Consulta as roles na tabela user_roles
      let userRoleFromDb: AppUserRole | null = null;
      try {
        const { data: urRows } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", currentUser.id);
        if (urRows && urRows.length > 0) {
          const rolesList = urRows.map((r: any) => r.role);
          if (rolesList.includes("super_admin")) {
            userRoleFromDb = isMasterByEmail ? "MASTER" : "ADMIN";
          } else if (rolesList.includes("admin")) {
            userRoleFromDb = "ADMIN";
          } else if (rolesList.includes("diretoria")) {
            userRoleFromDb = "diretoria";
          } else if (rolesList.includes("executivo")) {
            userRoleFromDb = "executivo";
          } else {
            userRoleFromDb = rolesList[0] as AppUserRole;
          }
        }
      } catch {}

      if (profRow) {
        const rowAny = profRow as any;
        const isMasterFinal = isMasterByEmail || profRow.is_superadmin === true;
        
        let finalRole: AppUserRole = "OPERATOR";
        if (isMasterFinal) {
          finalRole = "MASTER";
        } else if (
          isNexoAdminEmail(currentUser.email) ||
          rowAny.role === "admin" ||
          rowAny.role === "MASTER" ||
          rowAny.role === "super_admin" ||
          userRoleFromDb === "ADMIN" ||
          userRoleFromDb === "MASTER" ||
          metaRole === "ADMIN" ||
          metaRole === "MASTER"
        ) {
          // Administrador da Empresa / Tenant Admin (ex: Nexo)
          finalRole = "ADMIN";
        } else {
          finalRole = (rowAny.role as AppUserRole) || userRoleFromDb || metaRole || "OPERATOR";
        }

        const finalCnpj =
          profRow.cnpj_vinculado ||
          profRow.cnpj ||
          (currentUser.user_metadata?.cnpj as string) ||
          null;

        resolved = {
          id: profRow.id,
          email: profRow.email,
          nome: profRow.nome,
          role: finalRole,
          cnpj_vinculado: finalCnpj,
          cnpj: finalCnpj,
          tenant_id: profRow.tenant_id,
          is_superadmin: !!isMasterFinal,
        };
      }
    } catch (err) {
      console.warn("useAuth: erro inesperado ao consultar perfil:", err);
    }

    if (!resolved) {
      const isMasterFinal = isMasterByEmail;
      resolved = {
        id: currentUser.id,
        email: currentUser.email || "",
        nome: (currentUser.user_metadata?.nome as string) || null,
        role: isMasterFinal ? "MASTER" : (metaRole === "MASTER" ? "ADMIN" : metaRole || "OPERATOR"),
        cnpj_vinculado: (currentUser.user_metadata?.cnpj as string) || null,
        cnpj: (currentUser.user_metadata?.cnpj as string) || null,
        tenant_id: (currentUser.user_metadata?.tenant_id as string) || null,
        is_superadmin: !!isMasterFinal,
      };
    }

    setProfile(resolved);
    setRole(resolved.role);
    setCnpj(resolved.cnpj);
    setCnpjVinculado(resolved.cnpj_vinculado);
    setTenantId(resolved.tenant_id);
    setIsMaster(resolved.is_superadmin);
    setIsSuperAdmin(resolved.is_superadmin);
  };

  useEffect(() => {
    let resolved = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      resolveUserProfile(s?.user ?? null).finally(() => {
        setLoading(false);
        resolved = true;
      });
    });

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
        return resolveUserProfile(data.session?.user ?? null);
      })
      .catch((err) => {
        console.warn("useAuth getSession error:", err);
      })
      .finally(() => {
        setLoading(false);
        resolved = true;
      });

    // Timeout de segurança: nunca travar em loading por mais de 1.5s
    const timer = setTimeout(() => {
      if (!resolved) setLoading(false);
    }, 1500);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  // Atualiza last_active_at + renovação proativa transparente + força expiração após 24h
  useEffect(() => {
    if (!user || !session) return;

    const checkExpiry = () => {
      const lastSignIn = session.user.last_sign_in_at
        ? new Date(session.user.last_sign_in_at).getTime()
        : 0;
      // Regra de segurança: limite de 24 horas contínuas desde o login
      if (lastSignIn && Date.now() - lastSignIn > MAX_SESSION_MS) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("midiaos:session-expired", {
              detail: { reason: "Sessão expirada: limite de 24 horas atingido." },
            }),
          );
        }
        return true;
      }
      return false;
    };

    const maybeRefreshToken = async () => {
      const now = Date.now();
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      // Se o token de acesso vai expirar nos próximos 5 minutos e está dentro das 24h, renova silenciosamente
      if (expiresAt && expiresAt <= now + 300_000) {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (data?.session) {
            setSession(data.session);
          }
        } catch {
          /* ignore */
        }
      }
    };

    const touch = async () => {
      if (checkExpiry()) return;
      await maybeRefreshToken();
      const now = Date.now();
      if (now - lastTouchRef.current < HEARTBEAT_MS) return;
      lastTouchRef.current = now;
      try {
        await touchLastActive();
      } catch {
        /* ignore */
      }
    };

    touch();
    const interval = setInterval(touch, HEARTBEAT_MS);
    const onActivity = () => touch();
    window.addEventListener("focus", onActivity);
    window.addEventListener("click", onActivity);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("click", onActivity);
    };
  }, [user, session]);

  return {
    session,
    user,
    profile,
    role,
    cnpj,
    cnpjVinculado,
    tenantId,
    isMaster,
    isSuperAdmin,
    loading,
  };
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/login";
}
