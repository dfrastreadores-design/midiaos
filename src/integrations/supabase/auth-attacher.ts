// Middleware global de cliente para anexar token de autenticação Supabase aos serverFns
import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

let refreshPromise: Promise<string | null> | null = null;
const MAX_SESSION_MS = 24 * 60 * 60 * 1000; // Limite de 24 horas

async function getValidAccessToken(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const now = Date.now();
  const lastSignIn = session.user?.last_sign_in_at
    ? new Date(session.user.last_sign_in_at).getTime()
    : 0;

  // Se a sessão exceder o limite seguro de 24 horas contínuas, expira obrigatoriamente
  if (lastSignIn && now - lastSignIn > MAX_SESSION_MS) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("midiaos:session-expired", {
          detail: { reason: "Sessão expirada: limite máximo de 24 horas atingido." },
        }),
      );
    }
    return null;
  }

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
        // Se a sessão expirou completamente no servidor e o refresh falhou, dispara aviso para reautenticação
        if (expiresAt && expiresAt <= now) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("midiaos:session-expired", {
                detail: { reason: error?.message || "Token expirado e revogado" },
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
    let token = await getValidAccessToken();

    try {
      return await next({
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err: any) {
      const msg = String(err?.message || "").toLowerCase();
      const isTokenIssue =
        msg.includes("jwt expired") ||
        msg.includes("token is expired") ||
        msg.includes("invalid token");

      // Se ocorreu erro de token expirado no meio de uma requisição, tenta 1 renovação silenciosa e retenta
      if (isTokenIssue) {
        try {
          const { data, error: refErr } = await supabase.auth.refreshSession();
          if (!refErr && data?.session?.access_token) {
            token = data.session.access_token;
            return await next({
              headers: { Authorization: `Bearer ${token}` },
            });
          }
        } catch {
          /* ignore */
        }

        // Se a renovação também falhou, então a sessão realmente expirou ou foi revogada
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
