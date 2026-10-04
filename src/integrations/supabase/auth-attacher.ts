// Middleware global de cliente para anexar token de autenticação Supabase aos serverFns
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

let refreshPromise: Promise<string | null> | null = null;

async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const now = Date.now();
  const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
  const isExpiringSoon = !expiresAt || expiresAt <= now + 120_000; // 2 minutos de margem de segurança

  if (!isExpiringSoon) {
    return session.access_token;
  }

  // Se já houver uma renovação de token em andamento, reaproveita a mesma promessa (evita race condition no refresh token rotation)
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const { data: refreshData, error } = await supabase.auth.refreshSession();
      if (error || !refreshData?.session) {
        console.warn("[attachSupabaseAuth] Aviso ao renovar token da sessão:", error?.message);
        // Se a sessão expirou completamente no servidor, dispara aviso para reautenticação
        if (expiresAt && expiresAt <= now) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("midiaos:session-expired", {
                detail: { reason: error?.message || "Token expirado" },
              }),
            );
          }
          return null;
        }
        return session.access_token;
      }
      return refreshData.session.access_token;
    } catch (err) {
      console.warn("[attachSupabaseAuth] Erro ao renovar token da sessão:", err);
      return session.access_token;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const token = await getValidAccessToken();

    try {
      return await next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      if (
        msg.includes("jwt expired") ||
        msg.includes("token is expired") ||
        msg.includes("invalid token") ||
        msg.includes("no authorization header")
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("midiaos:session-expired", {
              detail: { reason: err?.message },
            }),
          );
        }
      }
      throw err;
    }
  },
);
