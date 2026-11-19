import { getRequest, getRequestHeader } from "@tanstack/react-start/server";

/**
 * Funções utilitárias de requisição isoladas em módulo .server.ts.
 * Evita violações do import-protection do TanStack Start no bundle do cliente.
 */

export function safeGetRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}

export function safeGetRequestHeader(name: string): string | null {
  try {
    return getRequestHeader(name) ?? null;
  } catch {
    return null;
  }
}

export function getClientIp(): string | null {
  try {
    return (
      getRequestHeader("cf-connecting-ip") ||
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestHeader("x-real-ip") ||
      null
    );
  } catch {
    return null;
  }
}

export function getOriginFromRequest(fallback = "https://midiaos.online"): string {
  try {
    const req = getRequest();
    if (req?.url) {
      return new URL(req.url).origin;
    }
  } catch {
    // ignore
  }
  return fallback;
}
