import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { touchLastActive } from "@/lib/presence.functions";
import { isMasterEmail } from "@/lib/master-user";

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

const MAX_SESSION_MS = 5 * 24 * 60 * 60 * 1000; // 5 dias
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

    const isMasterByEmail = isMasterEmail(currentUser.email);
    const metaRole = (currentUser.user_metadata?.role as AppUserRole) || null;
    const isSuperByMeta = !!(
      currentUser.user_metadata?.is_superadmin ||
      isMasterByEmail ||
      metaRole === "MASTER"
    );

    let resolved: AuthProfile | null = null;
    try {
      const { data: profRow } = await supabase
        .from("profiles")
        .select("id, email, nome, role, cnpj_vinculado, cnpj, tenant_id, is_superadmin")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (profRow) {
        const isMasterFinal =
          isMasterByEmail ||
          profRow.is_superadmin ||
          profRow.role === "MASTER" ||
          isSuperByMeta;
        const finalRole = (
          isMasterFinal
            ? "MASTER"
            : (profRow.role as AppUserRole) || metaRole || "OPERATOR"
        ) as AppUserRole;
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
      console.warn("useAuth: erro ao consultar perfil:", err);
    }

    if (!resolved) {
      const isMasterFinal = isMasterByEmail || isSuperByMeta;
      resolved = {
        id: currentUser.id,
        email: currentUser.email || "",
        nome: (currentUser.user_metadata?.nome as string) || null,
        role: isMasterFinal ? "MASTER" : (metaRole || "OPERATOR"),
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
    setIsMaster(resolved.is_superadmin || resolved.role === "MASTER");
    setIsSuperAdmin(resolved.is_superadmin || resolved.role === "MASTER");
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

  // Atualiza last_active_at + força logout após 5 dias contínuos
  useEffect(() => {
    if (!user || !session) return;

    const checkExpiry = () => {
      const lastSignIn = session.user.last_sign_in_at
        ? new Date(session.user.last_sign_in_at).getTime()
        : 0;
      if (lastSignIn && Date.now() - lastSignIn > MAX_SESSION_MS) {
        signOut();
        return true;
      }
      return false;
    };

    const touch = async () => {
      if (checkExpiry()) return;
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
