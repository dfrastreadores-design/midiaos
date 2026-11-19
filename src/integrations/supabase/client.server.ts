import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
export function getSupabaseServiceRoleKey(): string | null {
  if (typeof process !== "undefined" && process.env) {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
    if (process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
      return process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
    }
  }
  return null;
}

export function hasServiceRoleKey(): boolean {
  const key = getSupabaseServiceRoleKey();
  if (!key) return false;
  if (key.startsWith("sb_secret_")) return true;
  try {
    const parts = key.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
      return payload?.role === "service_role";
    }
  } catch {}
  return Boolean(key);
}

function createSupabaseAdminClient() {
  const SUPABASE_URL =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://tvniawyweymutjiybxyo.supabase.co";

  const SUPABASE_SERVICE_ROLE_KEY = getSupabaseServiceRoleKey();

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing: string[] = [];
    if (!SUPABASE_URL) missing.push("SUPABASE_URL / VITE_SUPABASE_URL");
    if (!SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    const message = `[Supabase Admin] Falha de inicialização: Chave administrativa ausente (${missing.join(", ")}). Configure SUPABASE_SERVICE_ROLE_KEY no ambiente do servidor.`;
    console.error(message);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Import like: import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});

